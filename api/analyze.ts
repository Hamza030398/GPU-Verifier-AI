import { InferenceClient } from "@huggingface/inference";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { base64Image, gpuModel, summary, profileId } = req.body;

  if (!base64Image) {
    return res.status(400).json({ error: "Image data missing" });
  }

  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) {
    return res.status(500).json({ error: "HF_TOKEN not configured" });
  }

  const client = new InferenceClient(hfToken);

  try {
    // Step 1: Use image-to-text model to describe the image
    const imageDescriptionResponse = await client.imageToText({
      model: "Salesforce/blip-image-captioning-large",
      inputs: `data:image/png;base64,${base64Image}`,
    });

    // Extract description (ensure it is string)
    const descriptionText = typeof imageDescriptionResponse === "string" 
      ? imageDescriptionResponse 
      : JSON.stringify(imageDescriptionResponse);

    // Step 2: Use a text model to turn the description into JSON
    const prompt = `
You are GPUVerify AI. Extract GPU telemetry from the following description and return ONLY JSON with these fields:
- gpu_model_detected
- core_clock
- memory_clock
- vbios
- subvendor
- temperature
- authenticity_score (0-100)
- notes

Description:
${descriptionText}

Return JSON only. No markdown.
`;

    const jsonResponse = await client.chatCompletion({
      model: "google/flan-t5-small",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 300,
    });

    const result = jsonResponse?.choices?.[0]?.message?.content || "{}";
    res.status(200).json(result);

  } catch (e: any) {
    console.error("Inference error:", e);
    res.status(500).json({
      error: e.message || "Inference failed",
    });
  }
}
