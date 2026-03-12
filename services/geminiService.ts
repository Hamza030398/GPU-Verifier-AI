import { HfInference } from "@huggingface/inference";
import { UploadedImage, GPUAssessmentResult, ImageType } from "../types";

// Ensure your Vercel Environment Variables are named VITE_HF_TOKEN and VITE_TAVILY_API_KEY
const hf = new HfInference(import.meta.env.VITE_HF_TOKEN);
const TAVILY_API_KEY = import.meta.env.VITE_TAVILY_API_KEY;

const BASE_SYSTEM_INSTRUCTION = `You are GPU-Verify AI, an elite hardware expert. 
Your goal is to extract technical telemetry from GPU images and provide a market audit.
Analyze: Core/Memory Clocks, VBIOS version, Subvendor, and Temperatures.
ALWAYS return only a valid JSON object. Do not include markdown code blocks or text outside the JSON.`;

/**
 * Converts File to Base64 Data URI for Hugging Face
 */
const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

/**
 * Searches the web via Tavily for current pricing
 */
async function getMarketData(gpuModel: string) {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
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
  
  // 1. Get Web Market Context
  const { summary, urls } = await getMarketData(gpuModel);

  // 2. Prepare the primary image 
  // Using Enum values instead of strings to satisfy TypeScript strictness
  const perfImage = images.find(img => 
    img.type === ImageType.GPUZ || img.type === ImageType.FURMARK
  ) || images[0];
  
  const dataUrl = await fileToBase64(perfImage.file);

  // 3. Inference call using Qwen2.5-VL
  try {
    const response = await hf.chatCompletion({
      model: "Qwen/Qwen2.5-VL-7B-Instruct",
      messages: [
        { role: "system", content: BASE_SYSTEM_INSTRUCTION },
        {
          role: "user",
          content: [
            { type: "text", text: `Target GPU: ${gpuModel}. Profile: ${profileId}. Market Context: ${summary}. Analyze the image and return a JSON report.` },
            { type: "image_url", image_url: { url: dataUrl } }
          ]
        }
      ],
      max_tokens: 1200,
      temperature: 0.1
    });

    const content = response.choices[0].message.content || "{}";
    
    // Parse the JSON result
    const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content;
    const result = JSON.parse(jsonStr) as GPUAssessmentResult;
    
    // Attach grounding URLs
    result.grounding_urls = urls;
    
    return result;
  } catch (error: any) {
    if (error.message?.includes("503")) {
      throw new Error("AI Model is currently waking up on Hugging Face. Please try again in 30 seconds.");
    }
    throw error;
  }
};
