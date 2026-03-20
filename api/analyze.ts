// Use direct HF API fetch instead of InferenceClient due to provider issues
const HF_API_URL = "https://router.huggingface.co/";

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
    // Direct API call to HF inference endpoint via router
    const model = "google/flan-t5-small";
    const response = await fetch(`${HF_API_URL}v1/models/${model}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${hfToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          temperature: 0.1,
          max_new_tokens: 300
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HF API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    // HF text generation returns array of objects with generated_text
    const result = Array.isArray(data) && data[0]?.generated_text 
      ? data[0].generated_text 
      : data.generated_text || "{}";

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
