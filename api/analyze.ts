// OCR.space + LLM Hybrid Approach
// 1. OCR.space extracts text from images (free: 25k requests/month)
// 2. Text sent to cheap LLM (Claude Haiku/GPT-3.5) for analysis
// Much cheaper than vision models, no rate limits
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { ocrText, gpuModel, summary, profileId } = req.body;

  if (!ocrText || typeof ocrText !== "string" || ocrText.length === 0) {
    return res.status(400).json({ error: "OCR text data missing" });
  }

  const apiKey = process.env.CLAUDE_API_KEY || process.env.VITE_CLAUDE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "CLAUDE_API_KEY not configured" });
  }

  try {
    // Build prompt with OCR extracted text
    const prompt = `GPU: ${gpuModel}

Extracted text from ${ocrText.split("===").length - 1} GPU images:
${ocrText}

Analyze this data and extract:
- model: exact GPU model name
- core_clock: MHz (from GPU-Z or FurMark)
- memory_clock: MHz (from GPU-Z)
- vbios: version string
- subvendor: manufacturer (ASUS, MSI, etc.)
- temp: max temperature from FurMark
- authenticity_score: 0-100 based on spec consistency
- notes: any anomalies or concerns

Return JSON only with these fields: model, core_clock, memory_clock, vbios, subvendor, temp, authenticity_score, notes`;

    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 500,
        temperature: 0.1,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    // Claude format returns content array with text
    const result = data.content?.[0]?.text || "{}";

    res.status(200).json(result);

  } catch (e: any) {
    console.error("Claude error:", e);
    
    const statusCode = e.response?.status || e.status;
    const errorMessage = e.message || "";
    
    if (statusCode === 429) {
      return res.status(429).json({
        error: "Claude rate limit exceeded."
      });
    }
    
    if (statusCode === 401 || statusCode === 403) {
      return res.status(401).json({
        error: "Claude API authentication failed. Check CLAUDE_API_KEY."
      });
    }
    
    res.status(500).json({
      error: errorMessage || "Inference failed",
      statusCode: statusCode,
      details: e.response?.data || "No additional details"
    });
  }
}
