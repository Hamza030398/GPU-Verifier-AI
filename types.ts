export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
  type: ImageType;
}

export enum ImageType {
  FRONT_SHROUD = "front_shroud",
  BACKPLATE = "backplate",
  IO_SHIELD = "io_shield",
  PCIE_LANES = "pcie_lanes",
  POWER_CONNECTOR = "power_connector",
  HEATSINK = "heatsink",
  FURMARK = "furmark",
  GPUZ = "gpuz"
}

export const IMAGE_LABELS: Record<ImageType, string> = {
  [ImageType.FRONT_SHROUD]: "Front Shroud",
  [ImageType.BACKPLATE]: "Backplate",
  [ImageType.IO_SHIELD]: "I/O Shield",
  [ImageType.PCIE_LANES]: "PCIe Lanes",
  [ImageType.POWER_CONNECTOR]: "Power Connector",
  [ImageType.HEATSINK]: "Heatsink Top View",
  [ImageType.FURMARK]: "FurMark Screenshot",
  [ImageType.GPUZ]: "GPU-Z Screenshot"
};

export const IMAGE_INSTRUCTIONS: Record<ImageType, string> = {
  [ImageType.FRONT_SHROUD]: "Capture the fans, shroud condition, and stickers.",
  [ImageType.BACKPLATE]: "Show the full PCB back, screws, and warranty seals.",
  [ImageType.IO_SHIELD]: "Focus on the display ports and metal bracket alignment.",
  [ImageType.PCIE_LANES]: "Close-up of the gold connector fingers (bottom edge).",
  [ImageType.POWER_CONNECTOR]: "Close-up of the power input pins (checking for melt).",
  [ImageType.HEATSINK]: "Top view showing heatpipe condition and fin density.",
  [ImageType.FURMARK]: "Screen capture of a running stress test (with temp graph).",
  [ImageType.GPUZ]: "Screen capture of the main 'Graphics Card' tab specs."
};

export interface PhysicalSubRatings {
  cleanliness: number;
  structural_integrity: number;
  electrical_safety: number;
}

export interface PhysicalAnalysis {
  overall_physical_rating: number;
  sub_ratings: PhysicalSubRatings;
  ai_feedback_comments: string;
}

export interface DetailedMetric {
  feature: string;
  observed: string;
  reference: string;
  status: "Match" | "Deviation" | "Critical";
}

export interface PerformanceAnalysis {
  authenticity_status: "Verified" | "Mismatch" | "Fake" | "Unknown";
  performance_percentile: number;
  thermal_health_score: number;
  validation_notes: string;
  detailed_metrics?: DetailedMetric[];
}

export interface MarketData {
  average_price: string;
  price_range: string;
  currency: string;
  model_identified: string;
}

export interface FinalReport {
  overall_score: number;
  market_value_adjustment: number;
  verdict: "Recommend Purchase" | "Negotiate" | "Avoid";
}

export interface GPUAssessmentResult {
  physical: PhysicalAnalysis;
  performance: PerformanceAnalysis;
  market_analysis?: MarketData;
  report: FinalReport;
  grounding_urls?: string[];
}

export enum AppStep {
  UPLOAD_PHYSICAL = 0,
  UPLOAD_PERFORMANCE = 1,
  ANALYZING = 2,
  RESULTS = 3
}

export interface AssessmentProfile {
  id: string;
  name: string;
  description: string;
  focus_areas: string[];
}

export const ASSESSMENT_PROFILES: AssessmentProfile[] = [
  {
    id: "universal",
    name: "Universal Standard",
    description: "General purpose assessment for any GPU model.",
    focus_areas: ["PCB Damage", "Fan Integrity", "Port Oxidation"]
  },
  {
    id: "rtx_40_series",
    name: "NVIDIA RTX 40-Series Specialist",
    description: "Targeted analysis for high-power cards (4090/4080).",
    focus_areas: ["12VHPWR Connector Melting", "PCB Cracking (Sag)", "Heavy Flow-through Dust"]
  },
  {
    id: "mining_risk",
    name: "Mining Risk Assessment",
    description: "Optimized to detect signs of prolonged 24/7 mining usage.",
    focus_areas: ["VRAM Discoloration", "Thermal Pad Oil Leaks", "BIOS Modifications"]
  },
  {
    id: "vintage_legacy",
    name: "Legacy/Vintage Collector",
    description: "For older GPUs (GTX 900 series and older).",
    focus_areas: ["Capacitor Swelling", "Thermal Paste Cementing", "Fan Bearing Noise"]
  }
];