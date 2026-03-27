import { GPUAssessmentResult } from "../types";

/**
 * Generate mock GPU assessment data for testing
 * This saves API quota (RPD/RPM) during development
 */
export function generateMockAssessment(gpuModel: string): GPUAssessmentResult {
  const modelName = gpuModel || "NVIDIA GeForce RTX 3080";
  
  return {
    physical: {
      overall_physical_rating: 92,
      sub_ratings: {
        thermal_solution: 95,
        pcb_integrity: 90,
        component_quality: 92
      },
      ai_feedback_comments: `Visual analysis of ${modelName} shows excellent condition. Minor dust accumulation on fans (-5%). No visible PCB damage, capacitor bulging, or corrosion. All thermal pads intact. Backplate screws present and undamaged. PCIe connector gold plating intact with minimal wear.`
    },
    performance: {
      authenticity_status: "Verified",
      performance_percentile: 78,
      thermal_health_score: 85,
      validation_notes: `GPU-Z validation: ${modelName} confirmed authentic. Boost clock matches reference specs. Memory clock stable. BIOS version authentic (not modified). Subvendor matches physical card branding. FurMark stress test passed - max temp 72°C within normal range.`,
      telemetry: {
        gpuz_detected: {
          base_clock: "1365 MHz",
          boost_clock: "1680 MHz",
          vram_amount: "8GB",
          vram_type: "GDDR6X",
          vram_manufacturer: "Micron",
          bus_width: "256-bit",
          shaders_cuda_cores: "8704",
          vbios_version: "94.02.71.00.8D",
          subvendor: "NVIDIA",
          subvendor_id: "10DE"
        },
        comparisons: [
          { spec_name: "Base/Boost Clock", observed: "1365 / 1680 MHz", reference: "1365 / 1680 MHz", status: "MATCH" },
          { spec_name: "VRAM Type & Amount", observed: "8GB GDDR6X (Micron)", reference: "8GB GDDR6X", status: "MATCH" },
          { spec_name: "Bus Width", observed: "256-bit", reference: "256-bit", status: "MATCH" },
          { spec_name: "CUDA Cores", observed: "8704", reference: "8704", status: "MATCH" },
          { spec_name: "VBIOS Version", observed: "94.02.71.00.8D", reference: "NVIDIA Reference", status: "MATCH" },
          { spec_name: "Subvendor ID", observed: "NVIDIA (10DE)", reference: "Matches Brand", status: "MATCH" }
        ],
        overall_match: true
      }
    },
    market_analysis: {
      average_price: "$450",
      price_range: "$400-$500",
      currency: "USD",
      model_identified: modelName
    },
    report: {
      overall_score: 88,
      market_value_adjustment: 0,
      verdict: "Recommend Purchase"
    },
    grounding_urls: [
      "https://www.ebay.com/sch/i.html?_nkw=RTX+3080",
      "https://www.amazon.com/s?k=rtx+3080+graphics+card"
    ]
  };
}

/**
 * Generate mock assessment with issues for testing edge cases
 */
export function generateMockAssessmentWithIssues(gpuModel: string): GPUAssessmentResult {
  const modelName = gpuModel || "AMD Radeon RX 6700 XT";
  
  return {
    physical: {
      overall_physical_rating: 65,
      sub_ratings: {
        thermal_solution: 60,
        pcb_integrity: 70,
        component_quality: 65
      },
      ai_feedback_comments: `Significant dust buildup on heatsink fins (-20%). Thermal paste appears dried/requiring replacement. One fan blade shows minor damage. PCB shows signs of previous repair near power delivery section. Corrosion visible on backplate screws. Recommend thorough cleaning and repaste before use.`
    },
    performance: {
      authenticity_status: "Mismatch",
      performance_percentile: 45,
      thermal_health_score: 55,
      validation_notes: `WARNING: GPU-Z shows ${modelName} but physical inspection suggests different cooler design. Possible cooler swap or fake card. VRAM amount mismatched (shows 12GB but BIOS reports 10GB). Flashing VBIOS detected. FurMark temps high (84°C). Recommend physical verification.`
    },
    market_analysis: {
      average_price: "$280",
      price_range: "$250-$320",
      currency: "USD",
      model_identified: modelName
    },
    report: {
      overall_score: 58,
      market_value_adjustment: -15,
      verdict: "Negotiate"
    },
    grounding_urls: [
      "https://www.ebay.com/sch/i.html?_nkw=RX+6700+XT+damaged"
    ]
  };
}

/**
 * Generate mock assessment for fake/counterfeit card
 */
export function generateMockAssessmentFake(gpuModel: string): GPUAssessmentResult {
  return {
    physical: {
      overall_physical_rating: 30,
      sub_ratings: {
        thermal_solution: 40,
        pcb_integrity: 25,
        component_quality: 25
      },
      ai_feedback_comments: `CRITICAL: Obvious counterfeit detected. Labels printed with low-quality ink. PCB color mismatch (blue instead of green). Missing capacitors near GPU core. Solder joints poor quality with visible flux residue. Serial number sticker appears reattached. Power connector pins misaligned.`
    },
    performance: {
      authenticity_status: "Fake",
      performance_percentile: 10,
      thermal_health_score: 20,
      validation_notes: `GPU-Z reports GTX 1050 Ti BIOS flashed to show as RTX 3060. CUDA core count doesn't match. Memory type mismatch (GDDR5 shown, RTX 3060 should have GDDR6). Device ID spoofed. DO NOT PURCHASE - This is a scam.`
    },
    market_analysis: {
      average_price: "N/A",
      price_range: "Avoid",
      currency: "USD",
      model_identified: "Counterfeit - Report to Seller"
    },
    report: {
      overall_score: 20,
      market_value_adjustment: 0,
      verdict: "Avoid"
    },
    grounding_urls: [
      "https://www.reddit.com/r/Scams/comments/fake_gpu_warnings/"
    ]
  };
}
