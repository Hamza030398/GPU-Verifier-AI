import { InferenceClient } from "@huggingface/inference";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { base64Image, gpuModel, summary, profileId } = req.body;

  if (!base64Image) {
    return res.status(400).json({ error: "Image data missing" });
  }

  // Pass token as a string, not an object
  const client = new InferenceClient(process.env.VITE_HF_TOKEN || "");

  const SYSTEM_PROMPT = `
You are GPUVerify AI. Extract GPU telemetry from screenshots and return ONLY JSON.

Fields to detect:
- gpu_model_detected
- core_clock
- memory_clock
- vbios
- subvendor
- temperature
- authenticity_score (0-100)
- notes

No markdown. No explanations. JSON only.
`;

  try {
    const response = await client.chatCompletion({
      model: "Salesforce/blip-image-captioning-large",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `GPU:${gpuModel} | Profile:${profileId} | Market:${summary}. Extract telemetry from image.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.1,
    });

    const result = response?.choices?.[0]?.message?.content || "{}";
    res.status(200).json(result);

  } catch (e: any) {
    res.status(500).json({
      error: e.message || "Inference failed",
    });
  }
}
