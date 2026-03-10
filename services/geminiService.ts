import { HfInference } from "@huggingface/inference";
import { UploadedImage, GPUAssessmentResult, ASSESSMENT_PROFILES } from "../types";

// Note the VITE_ prefix for Vite compatibility
const hf = new HfInference(import.meta.env.VITE_HF_TOKEN);
const TAVILY_API_KEY = import.meta.env.VITE_TAVILY_API_KEY;

const BASE_SYSTEM_INSTRUCTION = `You are GPU-Verify AI, an elite hardware expert. 
Your goal is to extract technical telemetry from GPU images and provide a market audit.
You must analyze: Core/Memory Clocks, VBIOS version, Subvendor, and Temperatures.
ALWAYS return only a valid JSON object. Do not include markdown code blocks or text outside the JSON.`;

/**
 * Converts File to Base64 for Hugging Face Vision API
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

  // 2. Prepare the primary image (usually the screenshot)
  const perfImage = images.find(img => img.type === "Performance Screenshot") || images[0];
  const base64Image = await fileToBase64(perfImage.file);

  // 3. Inference call using OpenAI-compatible format
  try {
    const response = await hf.chatCompletion({
      model: "Qwen/Qwen2.5-VL-7B-Instruct",
      messages: [
        { role: "system", content: BASE_SYSTEM_INSTRUCTION },
        {
          role: "user",
          content: [
            { type: "text", text: `Target: ${gpuModel}. Market Context: ${summary}` },
            { type: "image_url", image_url: { url: base64Image } }
          ]
        }
      ],
      max_tokens: 1200,
      temperature: 0.1
    });

    const content = response.choices[0].message.content || "";
    
    // Parse the JSON result
    const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content;
    const result = JSON.parse(jsonStr) as GPUAssessmentResult;
    
    // Attach grounding URLs from search
    result.grounding_urls = urls;
    
    return result;
  } catch (error: any) {
    if (error.message.includes("503")) {
      throw new Error("Model is loading on Hugging Face. Please try again in 30 seconds.");
    }
    throw error;
  }
};
