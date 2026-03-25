import { UploadedImage, GPUAssessmentResult } from "../types";
import { generateMockAssessment } from "./mockDataService";

/**
 * Convert image file to compressed base64 for API
 */
async function fileToBase64(file: File, maxWidth = 800, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Get base64 without data URL prefix
        const base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
        resolve(base64);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

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
  profileId: string,
  mockMode: boolean = false
): Promise<GPUAssessmentResult> => {

  if (!images.length) {
    throw new Error("No images provided.");
  }

  // MOCK MODE: Return mock data without API call (saves RPD/RPM)
  if (mockMode) {
    console.log("[MOCK MODE] Using mock data - no API call made");
    const { urls } = await getMarketData(gpuModel);
    const mockResult = generateMockAssessment(gpuModel);
    mockResult.grounding_urls = urls;
    // Simulate network delay for realistic testing
    await new Promise(resolve => setTimeout(resolve, 1500));
    return mockResult;
  }

  // 1️⃣ Fetch market context
  const { summary, urls } = await getMarketData(gpuModel);

  // 2️⃣ Convert images to compressed base64 (600px, 70% quality for TPM optimization)
  // 6 images at 600px/0.7 ≈ 120-150K tokens each = ~720K-900K total (within 200K-300K TPM)
  const base64Images = await Promise.all(
    images.map(img => fileToBase64(img.file, 600, 0.7))
  );

  // 3️⃣ Send images to Vercel serverless API for vision analysis
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
    
    // Remove markdown code blocks and whitespace
    textContent = textContent
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .replace(/\\n/g, "\n")  // Unescape newlines
      .replace(/\\"/g, '"')   // Unescape quotes
      .trim();
    
    console.log("DEBUG: Cleaned text:", textContent.substring(0, 200));
    
    // Find first { and last } - simple extraction
    const startIdx = textContent.indexOf('{');
    const endIdx = textContent.lastIndexOf('}');
    
    if (startIdx === -1) {
      throw new Error("No JSON object found in response");
    }
    
    let jsonStr = textContent.substring(startIdx);
    
    // If response appears truncated (no closing brace), add missing closing braces
    if (endIdx === -1 || endIdx < startIdx) {
      console.log("DEBUG: Response appears truncated, attempting to fix...");
      
      // First, check if we're in the middle of a string (odd number of unescaped quotes)
      const quoteMatches = jsonStr.match(/(?<!\\)"/g);
      const quoteCount = quoteMatches ? quoteMatches.length : 0;
      
      // If odd number of quotes, we're in an unclosed string - close it
      if (quoteCount % 2 !== 0) {
        jsonStr += '"'; // Close the open string
        console.log("DEBUG: Closed unclosed string");
      }
      
      // Close any incomplete property values with null
      // Match patterns like "key": "val or "key": 
      jsonStr = jsonStr.replace(/"([^"]+)":\s*"?[^"]*$/, '"$1": "[truncated]"');
      jsonStr = jsonStr.replace(/"([^"]+)":\s*$/, '"$1": null');
      
      // Count opening braces and add closing ones
      const openBraces = (jsonStr.match(/\{/g) || []).length;
      const closeBraces = (jsonStr.match(/\}/g) || []).length;
      const missingBraces = openBraces - closeBraces;
      
      if (missingBraces > 0) {
        jsonStr = jsonStr + '}'.repeat(missingBraces);
        console.log("DEBUG: Added", missingBraces, "closing braces");
      }
    } else {
      jsonStr = textContent.substring(startIdx, endIdx + 1);
    }
    
    // Remove any trailing commas before closing braces/brackets (common LLM error)
    jsonStr = jsonStr.replace(/,\s*\}/g, "}").replace(/,\s*\]/g, "]");
    
    console.log("DEBUG: Extracted JSON:", jsonStr.substring(0, 200));
    console.log("DEBUG: JSON length:", jsonStr.length);
    
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
