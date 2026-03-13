import { UploadedImage, GPUAssessmentResult, ImageType } from "../types";

/**
 * Convert File → Base64 (remove prefix)
 */
const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };

    reader.onerror = error => reject(error);
  });
};

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

/**
 * Select best image for AI analysis
 * Prefer GPUZ or FurMark screenshots
 */
function selectPrimaryImage(images: UploadedImage[]) {
  const perfImage = images.find(
    img => img.type === ImageType.GPUZ
  );

  if (perfImage) return perfImage;

  const furmark = images.find(
    img => img.type === ImageType.FURMARK
  );

  if (furmark) return furmark;

  return images[0];
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

  // 2️⃣ Choose best image
  const primaryImage = selectPrimaryImage(images);

  // 3️⃣ Convert image to base64
  const base64Image = await fileToBase64(primaryImage.file);

  // 4️⃣ Send to Vercel serverless API
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      base64Image,
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
