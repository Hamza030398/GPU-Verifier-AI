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

/*
Shorter labels reduce tokens when used in prompts
*/
export const IMAGE_LABELS: Record<ImageType, string> = {
  [ImageType.FRONT_SHROUD]: "Front",
  [ImageType.BACKPLATE]: "Backplate",
  [ImageType.IO_SHIELD]: "I/O",
  [ImageType.PCIE_LANES]: "PCIe",
  [ImageType.POWER_CONNECTOR]: "Power",
  [ImageType.HEATSINK]: "Heatsink",
  [ImageType.FURMARK]: "FurMark",
  [ImageType.GPUZ]: "GPU-Z"
};

/*
Instructions kept concise to reduce token size when used in prompts
*/
export const IMAGE_INSTRUCTIONS: Record<ImageType, string> = {
  [ImageType.FRONT_SHROUD]: "Fans and shroud condition.",
  [ImageType.BACKPLATE]: "PCB back and screws.",
  [ImageType.IO_SHIELD]: "Display ports and bracket.",
  [ImageType.PCIE_LANES]: "Gold PCIe connector.",
  [ImageType.POWER_CONNECTOR]: "Power pins condition.",
  [ImageType.HEATSINK]: "Heatpipes and fin stack.",
  [ImageType.FURMARK]: "Stress test screenshot.",
  [ImageType.GPUZ]: "GPU-Z main specs tab."
};

export interface PhysicalSubRatings {
  thermal_solution: number;      // Was: cleanliness - now covers cooling system, fans, thermal paste
  pcb_integrity: number;         // Was: structural_integrity - board condition, solder joints, trace damage
  component_quality: number;     // Was: electrical_safety - capacitors, VRMs, power delivery, connector condition
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

export interface TelemetrySpec {
  base_clock: string;
  boost_clock: string;
  vram_amount: string;
  vram_type: string;
  vram_manufacturer?: string;
  bus_width: string;
  shaders_cuda_cores: string;
  vbios_version: string;
  subvendor: string;
  subvendor_id?: string;
}

export interface TelemetryComparison {
  spec_name: string;
  observed: string;
  reference: string;
  status: "MATCH" | "MISMATCH" | "UNKNOWN";
}

export interface DetailedTelemetry {
  gpuz_detected: TelemetrySpec;
  comparisons: TelemetryComparison[];
  overall_match: boolean;
}

export interface PerformanceAnalysis {
  authenticity_status: "Verified" | "Mismatch" | "Fake" | "Unknown";
  performance_percentile: number;
  thermal_health_score: number;
  validation_notes: string;
  detailed_metrics?: DetailedMetric[];
  telemetry?: DetailedTelemetry;
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

/*
Profiles unchanged to keep UI behavior stable
*/
export const ASSESSMENT_PROFILES: AssessmentProfile[] = [
  {
    id: "universal",
    name: "Universal Standard",
    description: "General GPU condition assessment.",
    focus_areas: ["PCB Damage", "Fan Wear", "Port Oxidation"]
  },
  {
    id: "rtx_40_series",
    name: "RTX 40-Series Specialist",
    description: "Checks for high-power GPU risks.",
    focus_areas: ["12VHPWR Melt", "PCB Sag", "Flow-through Dust"]
  },
  {
    id: "mining_risk",
    name: "Mining Risk Assessment",
    description: "Detects heavy mining wear.",
    focus_areas: ["VRAM Discoloration", "Thermal Pad Oil", "BIOS Mods"]
  },
  {
    id: "vintage_legacy",
    name: "Legacy/Vintage Collector",
    description: "For older GPUs.",
    focus_areas: ["Capacitor Swell", "Thermal Paste Aging", "Fan Bearings"]
  }
];
