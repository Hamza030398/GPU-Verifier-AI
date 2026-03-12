// api/analyze.ts
import { HfInference } from "@huggingface/inference";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  const { base64Image, gpuModel, summary, profileId } = req.body;
  // Use process.env on the server side
  const hf = new HfInference(process.env.VITE_HF_TOKEN);

  try {
    const response = await hf.chatCompletion({
      model: "Qwen/Qwen2.5-VL-7B-Instruct",
      messages: [
        { role: "system", content: "You are GPU-Verify AI, an elite hardware expert. Extract technical telemetry and provide a JSON report." },
        {
          role: "user",
          content: [
            { type: "text", text: `Target GPU: ${gpuModel}. Profile: ${profileId}. Market Context: ${summary}.` },
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
