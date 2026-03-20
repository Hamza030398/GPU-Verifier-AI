// Use direct HF API fetch instead of InferenceClient due to provider issues
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { base64Images, gpuModel, summary, profileId } = req.body;

  if (!base64Images || !Array.isArray(base64Images) || base64Images.length === 0) {
    return res.status(400).json({ error: "Image data missing" });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
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

    // Free vision model - Gemini 2.0 Flash (fast, accurate, free tier)
    // No model variable needed for Gemini endpoint
    const response = await fetch(`${GEMINI_API_URL}/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: content.map(c => {
            if (c.type === "text") return { text: c.text };
            if (c.type === "image_url") {
              const base64Data = c.image_url.url.replace("data:image/jpeg;base64,", "").replace("data:image/png;base64,", "");
              return {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Data
                }
              };
            }
            return {};
          })
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    // Gemini format returns candidates with content.parts
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    res.status(200).json(result);

  } catch (e: any) {
    console.error("Gemini error:", e);
    
    const statusCode = e.response?.status || e.status;
    const errorMessage = e.message || "";
    
    if (statusCode === 429) {
      return res.status(429).json({
        error: "Gemini rate limit exceeded. Free tier: 15 requests/min, 1500/day."
      });
    }
    
    if (statusCode === 400 && errorMessage.includes("API key")) {
      return res.status(401).json({
        error: "Invalid Gemini API key. Check GEMINI_API_KEY."
      });
    }
    
    if (statusCode === 403) {
      return res.status(403).json({
        error: "Gemini API access denied. Enable Generative Language API in Google Cloud."
      });
    }
    
    res.status(500).json({
      error: errorMessage || "Inference failed",
      statusCode: statusCode,
      details: e.response?.data || "No additional details"
    });
  }
}
