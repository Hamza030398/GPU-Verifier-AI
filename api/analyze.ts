// Use direct HF API fetch instead of InferenceClient due to provider issues
const HF_API_URL = "https://router.huggingface.co/";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { base64Images, gpuModel, summary, profileId } = req.body;

  if (!base64Images || !Array.isArray(base64Images) || base64Images.length === 0) {
    return res.status(400).json({ error: "Image data missing" });
  }

  const hfToken = process.env.HF_TOKEN || process.env.VITE_HF_TOKEN;
  if (!hfToken) {
    return res.status(500).json({ error: "HF_TOKEN not configured" });
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

    // Free vision model through HF Router (using sambanova provider for free tier)
    const model = "meta-llama/Llama-3.2-11B-Vision-Instruct:sambanova";
    const response = await fetch(`${HF_API_URL}v1/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${hfToken}`,
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
      throw new Error(`HF API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    // OpenAI format returns choices array with message.content
    const result = data.choices?.[0]?.message?.content || "{}";

    res.status(200).json(result);

  } catch (e: any) {
    console.error("Inference error:", e);
    
    // Check for specific HTTP errors
    const statusCode = e.response?.status || e.status;
    const errorMessage = e.message || "";
    
    // Rate limit detection
    if (statusCode === 429 || errorMessage.includes("rate limit")) {
      return res.status(429).json({
        error: "Hugging Face rate limit exceeded. Free tier allows limited requests per hour. Please wait a few minutes and try again."
      });
    }
    
    // Model loading/cold start
    if (statusCode === 503 || errorMessage.includes("loading") || errorMessage.includes("waking up")) {
      return res.status(503).json({
        error: "Model is loading on Hugging Face (free tier cold start). This takes ~30-60 seconds. Please retry shortly."
      });
    }
    
    // Authentication errors
    if (statusCode === 401 || statusCode === 403) {
      return res.status(401).json({
        error: "Hugging Face authentication failed. Check HF_TOKEN is valid."
      });
    }
    
    res.status(500).json({
      error: errorMessage || "Inference failed",
      statusCode: statusCode,
      details: e.response?.data || "No additional details"
    });
  }
}
