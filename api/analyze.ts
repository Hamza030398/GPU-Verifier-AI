// Gemini 2.0 Flash Vision API
// Direct image analysis for GPU physical condition assessment
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
    // Build content parts with images
    const imageParts = base64Images.map((base64: string) => ({
      inlineData: {
        mimeType: "image/jpeg",
        data: base64
      }
    }));

    // Build prompt for visual analysis
    const promptText = `Analyze these GPU images (minimum 4 required: Front Shroud, Backplate, FurMark, GPU-Z) for physical condition and authenticity.

GPU Model: ${gpuModel}
Market Context: ${summary}

Provide a detailed assessment focusing on:
1. Physical condition - scratches, dust, damage, corrosion, overall cleanliness
2. Structural integrity - PCB condition, component alignment, solder quality
3. Authenticity - signs of counterfeit, refurbishment, or tampering
4. Connector condition - PCIe pins, power connectors, display outputs
5. Thermal solution - heatsink/fan condition

Return ONLY valid JSON in this exact structure:

{
  "physical": {
    "overall_physical_rating": 85,
    "sub_ratings": {
      "cleanliness": 80,
      "structural_integrity": 90,
      "electrical_safety": 85
    },
    "ai_feedback_comments": "Detailed visual assessment of physical condition from images"
  },
  "performance": {
    "authenticity_status": "Verified",
    "performance_percentile": 75,
    "thermal_health_score": 82,
    "validation_notes": "Visual verification: authentic GPU appearance, proper component placement, no signs of repair"
  },
  "market_analysis": {
    "average_price": "$350",
    "price_range": "$300-$400",
    "currency": "USD",
    "model_identified": "Exact GPU model name from visual inspection"
  },
  "report": {
    "overall_score": 84,
    "market_value_adjustment": 0,
    "verdict": "Recommend Purchase"
  }
}

Verdict options: "Recommend Purchase", "Negotiate", "Avoid"
Authenticity options: "Verified", "Mismatch", "Fake", "Unknown"

Base ratings on visual inspection: dirty/dusty (-10-20%), visible damage (-20-40%), corrosion (-30-50%), counterfeit signs (Avoid).`;

    const response = await fetch(`${GEMINI_API_URL}/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: promptText },
            ...imageParts
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048
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
