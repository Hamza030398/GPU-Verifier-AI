import { GoogleGenAI } from "@google/genai";
import { UploadedImage, GPUAssessmentResult, ImageType, ASSESSMENT_PROFILES } from "../types";

const BASE_SYSTEM_INSTRUCTION = `
You are GPU-Verify AI, an elite hardware verification system designed to assess second-hand Graphics Processing Units (GPUs). 
Your visual analysis is extremely critical and detailed.

You will be provided with:
1. Context: A user-specified GPU Model and an Assessment Profile.
2. Images: Physical Inspection Images and Performance Screenshots (GPU-Z, FurMark).

**TASK 1: Real-Time Market Analysis (MANDATORY)**
- Use the 'googleSearch' tool to find the CURRENT USED MARKET PRICE for the specified GPU Model.
- Ignore 'New' prices. Look for eBay sold listings, Jawa, or hardware swap forums from the last 3 months.
- Determine an 'average_price' and a 'price_range'.

**TASK 2: Visual & Performance Analysis**
- **Physical Condition**: Rate 1-10.
- **Performance**: Analyze FurMark/GPU-Z images.
- **Detailed Telemetry**: Extract specific values from the screenshots (Observed) and compare them with the official specifications (Reference) for that model.

**MANDATORY METRICS TO EXTRACT & COMPARE:**
1. **Core Clock / Boost Clock**: Verify if the card is hitting advertised speeds or throttling.
2. **Memory Clock & Type**: Verify GDDR generation and speed.
3. **Bus Width**: Critical for detecting fakes (e.g., Fake 1050 Ti often has 128-bit vs 192-bit).
4. **Shaders/Cuda Cores**: The ultimate authenticity check.
5. **Temperatures**: Compare observed FurMark Max Temp to expected normal operating ranges.
6. **VBIOS Version & Subvendor**: 
   - Extract "BIOS Version" from GPU-Z.
   - Extract "Subvendor" (e.g., Sapphire, MSI, EVGA). 
   - **CRITICAL**: Check if the Subvendor matches the User's GPU Model brand. (e.g., If user claims "Sapphire Pulse" but Subvendor is "MSI", this is a strong indicator of a MINING VBIOS FLASH). Flag this as a "Deviation" or "Critical" in detailed metrics.

**OUTPUT FORMAT**
You MUST return the result as a raw JSON string. Do not wrap it in markdown code blocks if possible, but if you do, the parser will handle it.
The JSON must match this structure:
{
  "physical": {
    "overall_physical_rating": number,
    "sub_ratings": { "cleanliness": number, "structural_integrity": number, "electrical_safety": number },
    "ai_feedback_comments": string
  },
  "performance": {
    "authenticity_status": "Verified" | "Mismatch" | "Fake" | "Unknown",
    "performance_percentile": number,
    "thermal_health_score": number, // STRICTLY on a scale of 1-10. Do NOT use 0-100 or percentages. 10 is perfect.
    "validation_notes": string,
    "detailed_metrics": [
      {
        "feature": "Base/Boost Clock",
        "observed": "e.g., 1450 MHz",
        "reference": "e.g., 1440 MHz",
        "status": "Match" | "Deviation" | "Critical"
      },
      {
        "feature": "VRAM Type & Amount",
        "observed": "e.g., 8GB GDDR6",
        "reference": "e.g., 8GB GDDR6",
        "status": "Match"
      },
      {
        "feature": "Bus Width",
        "observed": "e.g., 256-bit",
        "reference": "e.g., 256-bit",
        "status": "Match"
      },
      {
        "feature": "VBIOS Version",
        "observed": "e.g., 015.050...",
        "reference": "Official/Unmodded",
        "status": "Match" | "Deviation"
      },
      {
        "feature": "Subvendor ID",
        "observed": "e.g., MSI (1462)",
        "reference": "Matches Brand (Sapphire)",
        "status": "Match" | "Critical"
      },
      {
        "feature": "Max Temperature (Load)",
        "observed": "e.g., 72°C",
        "reference": "e.g., < 83°C",
        "status": "Match"
      }
    ]
  },
  "market_analysis": {
    "average_price": string,
    "price_range": string,
    "currency": string,
    "model_identified": string
  },
  "report": {
    "overall_score": number, // STRICTLY on a scale of 1-10. Do NOT use 0-100.
    "market_value_adjustment": number,
    "verdict": "Recommend Purchase" | "Negotiate" | "Avoid"
  }
}
`;

// Helper to convert file to base64
const fileToPart = async (file: File, mimeType: string) => {
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: mimeType
        }
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeGPU = async (
  images: UploadedImage[], 
  gpuModel: string, 
  profileId: string
): Promise<GPUAssessmentResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const profile = ASSESSMENT_PROFILES.find(p => p.id === profileId) || ASSESSMENT_PROFILES[0];
  
  const contentParts: any[] = [];
  
  // Add context
  contentParts.push({ text: `Target GPU Model: ${gpuModel}` });
  contentParts.push({ text: `Selected Assessment Profile: ${profile.name} (${profile.description})` });
  contentParts.push({ text: `Focus Areas: ${profile.focus_areas.join(", ")}` });

  // Add images
  for (const img of images) {
    contentParts.push({ text: `[Image Type: ${img.type}]` });
    contentParts.push(await fileToPart(img.file, img.file.type));
  }
  
  contentParts.push({ text: "Analyze the images and market data. Return valid JSON." });

  // Use gemini-3-flash-preview which supports multimodal input and search tools.
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      role: "user",
      parts: contentParts
    },
    config: {
      systemInstruction: BASE_SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }], 
      temperature: 0.2
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");

  // Extract grounding metadata (URLs)
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const groundingUrls: string[] = [];
  
  groundingChunks.forEach(chunk => {
    if (chunk.web?.uri) {
      groundingUrls.push(chunk.web.uri);
    }
  });

  // Clean and parse JSON
  // We use a robust method to find the first '{' and the last '}' 
  // to ignore any conversational text or markdown blocks wrapping the JSON.
  let jsonString = text;
  const firstBrace = jsonString.indexOf('{');
  const lastBrace = jsonString.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1) {
    jsonString = jsonString.substring(firstBrace, lastBrace + 1);
  }

  try {
    const result = JSON.parse(jsonString) as GPUAssessmentResult;
    // Attach the grounding URLs to the result
    result.grounding_urls = groundingUrls;
    return result;
  } catch (e) {
    console.error("Failed to parse AI response:", text);
    throw new Error("Failed to parse assessment results. Raw output: " + text.substring(0, 100) + "...");
  }
};