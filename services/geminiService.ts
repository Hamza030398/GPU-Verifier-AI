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
   * Parse Gemini text response into JSON
   */
  let parsed: GPUAssessmentResult;

  try {
    // content is the text string from Gemini
    let textContent: string;
    
    console.log("DEBUG: Type of content:", typeof content);
    console.log("DEBUG: Content preview:", JSON.stringify(content).substring(0, 100));
    
    if (typeof content === "string") {
      textContent = content;
    } else if (content && typeof content === "object") {
      // If it's already an object from the API, use it directly
      if (content.physical && content.performance && content.report) {
        parsed = content as GPUAssessmentResult;
        parsed.grounding_urls = urls;
        return parsed;
      }
      textContent = JSON.stringify(content);
    } else {
      textContent = String(content);
    }
    
    console.log("DEBUG: textContent before cleaning:", textContent.substring(0, 100));
    
    // Remove markdown code blocks if present (```json ... ```))
    // Use global replacements to remove all markdown markers
    textContent = textContent
      .replace(/```json/gi, "")   // Remove all ```json
      .replace(/```/g, "");        // Remove all remaining ```
    
    console.log("DEBUG: textContent after removing markdown:", textContent.substring(0, 100));
    
    // Extract JSON by finding the first { and last }
    const firstBrace = textContent.indexOf('{');
    const lastBrace = textContent.lastIndexOf('}');
    
    console.log("DEBUG: firstBrace:", firstBrace, "lastBrace:", lastBrace);
    
    let jsonStr: string;
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      jsonStr = textContent.substring(firstBrace, lastBrace + 1);
    } else {
      // Fallback to regex extraction
      const match = textContent.match(/\{[\s\S]*\}/);
      jsonStr = match ? match[0] : textContent;
    }
    
    // Clean up any remaining whitespace/newlines around braces
    jsonStr = jsonStr.trim();
    
    console.log("DEBUG: Final jsonStr to parse:", jsonStr.substring(0, 100));
    
    // Try parsing
    try {
      parsed = JSON.parse(jsonStr);
      console.log("DEBUG: Successfully parsed JSON");
    } catch (parseError: any) {
      console.error("First parse attempt failed:", parseError.message);
      console.error("Attempted to parse:", jsonStr.substring(0, 100) + "...");
      
      // Try to fix common JSON issues
      // Remove any trailing commas before closing braces
      jsonStr = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
      
      try {
        parsed = JSON.parse(jsonStr);
        console.log("DEBUG: Successfully parsed JSON after fixing trailing commas");
      } catch (fixError) {
        throw parseError; // Throw original error if fix didn't work
      }
    }

  } catch (e: any) {
    console.error("JSON parse error:", e, "Raw content:", content);
    // Return a fallback result showing the error
    parsed = {
      physical: {
        overall_physical_rating: 0,
        sub_ratings: { cleanliness: 0, structural_integrity: 0, electrical_safety: 0 },
        ai_feedback_comments: "Error: Could not parse AI response. Raw response: " + JSON.stringify(content).slice(0, 200)
      },
      performance: {
        authenticity_status: "Unknown",
        performance_percentile: 0,
        thermal_health_score: 0,
        validation_notes: "Parse error occurred"
      },
      market_analysis: {
        average_price: "N/A",
        price_range: "N/A",
        currency: "USD",
        model_identified: "Parse Error"
      },
      report: {
        overall_score: 0,
        market_value_adjustment: 0,
        verdict: "Avoid"
      },
      grounding_urls: urls
    };
  }

  // Attach search sources
  parsed.grounding_urls = urls;

  return parsed;
};
