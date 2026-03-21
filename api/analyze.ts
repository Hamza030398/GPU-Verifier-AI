// Use direct HF API fetch instead of InferenceClient due to provider issues
const TOGETHER_API_URL = "https://api.together.xyz/v1";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { base64Images, gpuModel, summary, profileId } = req.body;

  if (!base64Images || !Array.isArray(base64Images) || base64Images.length === 0) {
    return res.status(400).json({ error: "Image data missing" });
  }

  const apiKey = process.env.TOGETHER_API_KEY || process.env.VITE_TOGETHER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "TOGETHER_API_KEY not configured" });
  }

  try {
    // Token-efficient prompt - minimal text, all images in one request
    const content: any[] = [
      { type: "text", text: `GPU: ${gpuModel}. Analyze these ${base64Images.length} GPU screenshots (GPU-Z/FurMark) and extract: model, core clock, memory clock, vbios, subvendor, temp, authenticity score 0-100, notes. Return JSON only.` }
    ];

    // Add all images to content array
    for (const base64 of base64Images) {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${base64}`
        }
      });
    }

    // Free vision model on Together AI - Llama 3.2 Vision
    const model = "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo";
    const response = await fetch(`${TOGETHER_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "user", content: content }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Together AI API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    // OpenAI format returns choices array with message.content
    const result = data.choices?.[0]?.message?.content || "{}";

    res.status(200).json(result);

  } catch (e: any) {
    console.error("Together AI error:", e);
    
    const statusCode = e.response?.status || e.status;
    const errorMessage = e.message || "";
    
    if (statusCode === 429) {
      return res.status(429).json({
        error: "Together AI rate limit exceeded. Free tier: 1 req/sec, 1000/day."
      });
    }
    
    if (statusCode === 401 || statusCode === 403) {
      return res.status(401).json({
        error: "Together AI authentication failed. Check TOGETHER_API_KEY."
      });
    }
    
    res.status(500).json({
      error: errorMessage || "Inference failed",
      statusCode: statusCode,
      details: e.response?.data || "No additional details"
    });
  }
}
