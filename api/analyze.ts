import { InferenceClient } from "@huggingface/inference";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { base64Image, gpuModel, summary, profileId } = req.body;

  // Use InferenceClient instead of HfInference
  // The base URL for the new router is https://router.huggingface.co/hf/v1
  const hf = new InferenceClient({
    accessToken: process.env.VITE_HF_TOKEN,
    baseUrl: "https://router.huggingface.co/hf/v1"
  });

  const BASE_SYSTEM_INSTRUCTION = `You are GPU-Verify AI, an elite hardware expert. 
Your goal is to extract technical telemetry from GPU images and provide a market audit.
Analyze: Core/Memory Clocks, VBIOS version, Subvendor, and Temperatures.
ALWAYS return only a valid JSON object. Do not include markdown code blocks or text outside the JSON.`;

  try {
    const response = await hf.chatCompletion({
      model: "Qwen/Qwen2.5-VL-7B-Instruct",
      messages: [
        { role: "system", content: BASE_SYSTEM_INSTRUCTION },
        {
          role: "user",
          content: [
            { type: "text", text: `Target GPU: ${gpuModel}. Profile: ${profileId}. Market Context: ${summary}. Analyze the image and return a JSON report.` },
            { type: "image_url", image_url: { url: `data:image/png;base64,${base64Image}` } }
          ]
        }
      ],
      max_tokens: 1200,
      temperature: 0.1
    });

    res.status(200).json(response.choices[0].message.content);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
