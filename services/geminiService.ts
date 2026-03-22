import { UploadedImage, GPUAssessmentResult, ImageType } from "../types";
import { extractTextFromAllImages, formatOCRForLLM } from "./ocrService";

/**
 * Fetch market context from Tavily
 * Reduced payload size to save tokens
 */
async function getMarketData(gpuModel: string) {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: import.meta.env.VITE_TAVILY_API_KEY,
        query: `${gpuModel} used price ebay sold`,
        max_results: 2
      }),
    });

    const data = await response.json();

    return {
      summary: data.results
        ?.map((r: any) => r.content)
        .join(" ")
        .slice(0, 500) || "No market data",
      urls: data.results?.map((r: any) => r.url) || []
    };

  } catch (e) {
    return { summary: "Market lookup failed.", urls: [] };
  }
}


export const analyzeGPU = async (
  images: UploadedImage[],
  gpuModel: string,
  profileId: string
): Promise<GPUAssessmentResult> => {

  if (!images.length) {
    throw new Error("No images provided.");
  }

  // 1️⃣ Fetch market context
  const { summary, urls } = await getMarketData(gpuModel);

  // 2️⃣ Extract text from all images using OCR.space
  const ocrApiKey = import.meta.env.VITE_OCR_SPACE_API_KEY;
  if (!ocrApiKey) {
    throw new Error("OCR_SPACE_API_KEY not configured");
  }

  const ocrResults = await extractTextFromAllImages(images, ocrApiKey);
  const ocrText = formatOCRForLLM(ocrResults);

  // 3️⃣ Send OCR text to Vercel serverless API for LLM analysis
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ocrText,
      gpuModel,
      summary,
      profileId
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Analysis server error.");
  }

  const content = await response.json();

  /**
   * More robust JSON parsing
   */
  let parsed: GPUAssessmentResult;

  try {
    const jsonStr = typeof content === "string"
      ? content.match(/\{[\s\S]*\}/)?.[0]
      : JSON.stringify(content);

    parsed = JSON.parse(jsonStr || "{}");

  } catch {
    throw new Error("Failed to parse AI response.");
  }

  // Attach search sources
  parsed.grounding_urls = urls;

  return parsed;
};
