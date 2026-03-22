import { UploadedImage, ImageType } from "../types";

/**
 * OCR.space API integration
 * Free tier: 25,000 requests/month
 * Extracts text from images for GPU spec analysis
 */
const OCR_SPACE_API_URL = "https://api.ocr.space/parse/image";

/**
 * Extract text from a single image using OCR.space
 */
async function extractTextFromImage(file: File, apiKey: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("language", "eng");
  formData.append("isOverlayRequired", "false");
  formData.append("OCREngine", "2"); // More accurate engine
  formData.append("scale", "true"); // Auto-scale for better accuracy
  
  const response = await fetch(`${OCR_SPACE_API_URL}?apikey=${apiKey}`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error(`OCR.space error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.IsErroredOnProcessing) {
    throw new Error(`OCR.space error: ${data.ErrorMessage}`);
  }

  // Extract text from parsed results
  const parsedText = data.ParsedResults
    ?.map((result: any) => result.ParsedText)
    .join("\n")
    || "";

  return parsedText;
}

/**
 * Extract text from all uploaded images
 * Returns array of {type, text} for each image
 */
export async function extractTextFromAllImages(
  images: UploadedImage[],
  apiKey: string
): Promise<{ type: ImageType; text: string }[]> {
  const results: { type: ImageType; text: string }[] = [];

  for (const image of images) {
    try {
      const text = await extractTextFromImage(image.file, apiKey);
      results.push({ type: image.type, text });
    } catch (e: any) {
      console.error(`OCR failed for ${image.type}:`, e);
      results.push({ type: image.type, text: "[OCR extraction failed]" });
    }
  }

  return results;
}

/**
 * Format OCR results into a structured text block for LLM analysis
 */
export function formatOCRForLLM(
  ocrResults: { type: ImageType; text: string }[]
): string {
  const typeNames: Record<ImageType, string> = {
    [ImageType.FRONT_SHROUD]: "Front Shroud",
    [ImageType.BACKPLATE]: "Backplate",
    [ImageType.IO_SHIELD]: "I/O Shield",
    [ImageType.PCIE_LANES]: "PCIe Lanes",
    [ImageType.POWER_CONNECTOR]: "Power Connector",
    [ImageType.HEATSINK]: "Heatsink",
    [ImageType.FURMARK]: "FurMark Stress Test",
    [ImageType.GPUZ]: "GPU-Z Screenshot"
  };

  return ocrResults
    .map(({ type, text }) => `
=== ${typeNames[type]} ===
${text}
`)
    .join("\n");
}
