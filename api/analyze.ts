// OCR.space + Gemini Text API Hybrid Approach
// 1. OCR.space extracts text from images (free: 25k requests/month)
// 2. Text sent to Gemini 1.5 Flash text model (free tier available)
// Much cheaper than vision models, no rate limits for text
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { ocrText, gpuModel, summary, profileId } = req.body;

  if (!ocrText || typeof ocrText !== "string" || ocrText.length === 0) {
    return res.status(400).json({ error: "OCR text data missing" });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  try {
    // Build prompt with OCR extracted text
    const prompt = `GPU: ${gpuModel}

Extracted text from ${ocrText.split("===").length - 1} GPU images:
${ocrText}

Analyze this data and return ONLY valid JSON in this exact structure:

{
  "physical": {
    "overall_physical_rating": 85,
    "sub_ratings": {
      "cleanliness": 80,
      "structural_integrity": 90,
      "electrical_safety": 85
    },
    "ai_feedback_comments": "Brief assessment of physical condition based on images"
  },
  "performance": {
    "authenticity_status": "Verified",
    "performance_percentile": 75,
    "thermal_health_score": 82,
    "validation_notes": "Key specs found: GPU model, core clock, memory clock, VBIOS, subvendor, max temp"
  },
  "market_analysis": {
    "average_price": "$350",
    "price_range": "$300-$400",
    "currency": "USD",
    "model_identified": "Exact GPU model name"
  },
  "report": {
    "overall_score": 84,
    "market_value_adjustment": 0,
    "verdict": "Recommend Purchase"
  }
}

Verdict options: "Recommend Purchase", "Negotiate", "Avoid"
Authenticity options: "Verified", "Mismatch", "Fake", "Unknown"

Use the extracted text to populate realistic values based on actual specs found.`;

    const response = await fetch(`${GEMINI_API_URL}/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
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
        error: "Gemini rate limit exceeded. Free tier: 15 req/min, 1500/day."
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
