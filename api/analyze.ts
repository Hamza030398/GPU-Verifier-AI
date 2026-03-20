// Use direct HF API fetch instead of InferenceClient due to provider issues
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { base64Images, gpuModel, summary, profileId } = req.body;

  if (!base64Images || !Array.isArray(base64Images) || base64Images.length === 0) {
    return res.status(400).json({ error: "Image data missing" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENROUTER_API_KEY not configured" });
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

    // Free vision model - Llama 3.2 11B Vision (supports chat/completions)
    const model = "meta-llama/llama-3.2-11b-vision-instruct";
    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
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
      throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    // OpenAI format returns choices array with message.content
    const result = data.choices?.[0]?.message?.content || "{}";

    res.status(200).json(result);

  } catch (e: any) {
    console.error("OpenRouter error:", e);
    
    const statusCode = e.response?.status || e.status;
    const errorMessage = e.message || "";
    
    if (statusCode === 429 || errorMessage.includes("rate limit")) {
      return res.status(429).json({
        error: "OpenRouter rate limit exceeded. Please wait and try again."
      });
    }
    
    if (statusCode === 503) {
      return res.status(503).json({
        error: "Model is temporarily unavailable. Please retry shortly."
      });
    }
    
    if (statusCode === 401 || statusCode === 403) {
      return res.status(401).json({
        error: "OpenRouter authentication failed. Check OPENROUTER_API_KEY is valid."
      });
    }
    
    res.status(500).json({
      error: errorMessage || "Inference failed",
      statusCode: statusCode,
      details: e.response?.data || "No additional details"
    });
  }
}
