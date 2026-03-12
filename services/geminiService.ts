import { UploadedImage, GPUAssessmentResult, ImageType } from "../types";

/**
 * Converts File to Base64 (stripping the data prefix)
 */
const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove the "data:image/png;base64," prefix for cleaner transmission
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Fetches market context from Tavily
 */
async function getMarketData(gpuModel: string) {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: import.meta.env.VITE_TAVILY_API_KEY,
        query: `used price for ${gpuModel} eBay sold listings 2026`,
        max_results: 3
      }),
    });
    const data = await response.json();
    return {
      summary: data.results.map((r: any) => r.content).join(" "),
      urls: data.results.map((r: any) => r.url)
    };
  } catch (e) {
    return { summary: "Price search failed.", urls: [] };
  }
}

export const analyzeGPU = async (
  images: UploadedImage[],
  gpuModel: string,
  profileId: string
): Promise<GPUAssessmentResult> => {
  
  // 1. Fetch market context (this stays on the client)
  const { summary, urls } = await getMarketData(gpuModel);

  // 2. Prepare the primary image
  const perfImage = images.find(img => 
    img.type === ImageType.GPUZ || img.type === ImageType.FURMARK
  ) || images[0];
  
  const base64Image = await fileToBase64(perfImage.file);

  // 3. Send data to your Vercel Serverless Function (avoids CORS)
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64Image, gpuModel, summary, profileId })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to contact analysis server.");
  }

  const content = await response.json();
  
  // Parse the JSON result returned by the API
  const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content;
  const result = JSON.parse(jsonStr) as GPUAssessmentResult;
  
  // Attach grounding URLs to the final result
  result.grounding_urls = urls;
  
  return result;
};
