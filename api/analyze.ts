import { InferenceClient } from "@huggingface/inference";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { base64Image, gpuModel, summary, profileId } = req.body;

  if (!base64Image) {
    return res.status(400).json({ error: "Image data missing" });
  }

  const hfToken = process.env.HF_TOKEN || process.env.VITE_HF_TOKEN;
  if (!hfToken) {
    return res.status(500).json({ error: "HF_TOKEN not configured" });
  }

  const client = new InferenceClient(hfToken);

  try {
    // ✅ Convert base64 → Blob (fixes TS + runtime)
    const imageBlob = new Blob(
      [Buffer.from(base64Image, "base64")],
      { type: "image/png" }
    );

    // Step 1: Build synthetic description (no image inference)
const descriptionText = `
GPU Model: ${gpuModel}
Market Info: ${summary}
Profile ID: ${profileId}

User uploaded a GPU screenshot (likely GPU-Z or FurMark).
Estimate likely telemetry values and detect inconsistencies if any.
`;

// Step 2: Text → structured JSON (free model)
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

    const result =
      jsonResponse?.choices?.[0]?.message?.content || "{}";

    res.status(200).json(result);

  } catch (e: any) {
    console.error("Inference error:", e);
    // Log more details for debugging
    if (e.response) {
      console.error("Error response:", e.response);
    }
    if (e.message) {
      console.error("Error message:", e.message);
    }
    res.status(500).json({
      error: e.message || "Inference failed",
      details: e.response?.data || "No additional details"
    });
  }
}
