import { UploadedImage, GPUAssessmentResult, ImageType } from "../types";

/**
 * Compress and resize image before converting to base64
 * Reduces token usage while maintaining quality for vision tasks
 */
const compressAndConvert = async (file: File, maxWidth: number = 1024, quality: number = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Canvas context not available"));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      
      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }
      }

      // Resize image
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to compressed base64
      const compressedBase64 = canvas.toDataURL("image/jpeg", quality).split(",")[1];
      resolve(compressedBase64);
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
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

  // 2️⃣ Filter to only technical images (GPU-Z + FurMark) for AI analysis
  const technicalImages = images.filter(img => 
    img.type === ImageType.GPUZ || img.type === ImageType.FURMARK
  );

  // 3️⃣ Compress and convert technical images only (reduces token usage)
  const base64Images = await Promise.all(
    technicalImages.map(img => compressAndConvert(img.file))
  );

  // 3️⃣ Send all images to Vercel serverless API
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      base64Images,
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
