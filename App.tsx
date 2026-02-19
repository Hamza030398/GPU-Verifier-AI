import React, { useState } from 'react';
import { UploadedImage, ImageType, AppStep, GPUAssessmentResult, ASSESSMENT_PROFILES } from './types';
import { analyzeGPU } from './services/geminiService';
import { UploadZone } from './components/UploadZone';
import { ResultsDashboard } from './components/ResultsDashboard';
import { GuideModal } from './components/GuideModal';
import { Cpu, LayoutDashboard, ChevronRight, Loader2, FileSearch, Settings, Info, FlaskConical, ArrowLeft, HelpCircle } from 'lucide-react';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD_PHYSICAL);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<GPUAssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // New State for Inputs
  const [gpuModel, setGpuModel] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState(ASSESSMENT_PROFILES[0].id);

  const handleUpload = (type: ImageType, file: File) => {
    const newImage: UploadedImage = {
      id: Math.random().toString(36).substr(2, 9),
      file,
      previewUrl: URL.createObjectURL(file),
      type
    };
    
    // Remove existing image of same type if exists
    setImages(prev => [...prev.filter(img => img.type !== type), newImage]);
  };

  const handleRemove = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const startAnalysis = async () => {
    if (!gpuModel.trim()) {
      setError("Please specify the full GPU name (Vendor + Model).");
      setStep(AppStep.UPLOAD_PHYSICAL);
      return;
    }

    setStep(AppStep.ANALYZING);
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeGPU(images, gpuModel, selectedProfileId);
      setResult(result);
      setStep(AppStep.RESULTS);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during analysis.");
      setStep(AppStep.UPLOAD_PERFORMANCE); // Go back to allow retry
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetApp = () => {
    setImages([]);
    setResult(null);
    setStep(AppStep.UPLOAD_PHYSICAL);
    setError(null);
    setGpuModel("");
  };

  const handleEdit = () => {
    setStep(AppStep.UPLOAD_PERFORMANCE);
  };

  const loadDemoData = async () => {
    const demoModels = [
      "Sapphire Nitro+ AMD Radeon RX 6900 XT",
      "ASUS ROG Strix GeForce RTX 3080 Ti",
      "MSI Suprim X GeForce RTX 4090",
      "GIGABYTE AORUS GeForce RTX 3070 Master",
      "EVGA GeForce RTX 3060 XC Gaming"
    ];
    const randomModel = demoModels[Math.floor(Math.random() * demoModels.length)];
    setGpuModel(randomModel);

    // Simple heuristic for profile
    if (randomModel.includes("4090")) {
      setSelectedProfileId("rtx_40_series");
    } else {
      setSelectedProfileId("universal");
    }

    // Create dummy files (1x1 gray pixel)
    const base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    const res = await fetch(`data:image/png;base64,${base64}`);
    const blob = await res.blob();

    const demoTypes = [
      ImageType.FRONT_SHROUD,
      ImageType.BACKPLATE,
      ImageType.IO_SHIELD,
      ImageType.PCIE_LANES,
      ImageType.FURMARK,
      ImageType.GPUZ
    ];

    const newImages = demoTypes.map(type => {
      const file = new File([blob], `demo_${type}.png`, { type: "image/png" });
      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        type
      };
    });

    setImages(newImages);
    setStep(AppStep.UPLOAD_PERFORMANCE);
    setError(null);
  };

  const getImage = (type: ImageType) => images.find(img => img.type === type);

  const physicalTypes = [
    ImageType.FRONT_SHROUD,
    ImageType.BACKPLATE,
    ImageType.IO_SHIELD,
    ImageType.PCIE_LANES,
    ImageType.POWER_CONNECTOR,
    ImageType.HEATSINK
  ];

  const performanceTypes = [
    ImageType.FURMARK,
    ImageType.GPUZ
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-emerald-500/30">
      
      <GuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />

      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
              <Cpu className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">
              GPU<span className="text-emerald-400">-Verify</span> AI
            </span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
               <span className={step === AppStep.UPLOAD_PHYSICAL ? "text-emerald-400" : ""}>1. Details & Physical</span>
               <ChevronRight className="w-4 h-4 text-slate-700" />
               <span className={step === AppStep.UPLOAD_PERFORMANCE ? "text-emerald-400" : ""}>2. Performance</span>
               <ChevronRight className="w-4 h-4 text-slate-700" />
               <span className={step >= AppStep.ANALYZING ? "text-emerald-400" : ""}>3. Results</span>
            </div>
            
            <button 
              onClick={() => setShowGuide(true)}
              className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-full transition-colors"
              title="How it works"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {error && (
          <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/50 rounded-lg text-rose-300 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            {error}
          </div>
        )}

        {/* Step 1: Physical Upload */}
        {step === AppStep.UPLOAD_PHYSICAL && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Assessment Configuration</h1>
                <p className="text-slate-400">Specify the model and required checks before uploading physical evidence.</p>
              </div>
              <button 
                onClick={loadDemoData}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-emerald-400 transition-colors whitespace-nowrap"
              >
                <FlaskConical className="w-4 h-4" />
                <span>Test with Random GPU</span>
              </button>
            </div>

            {/* Config Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Full GPU Name <span className="text-slate-500 font-normal">(Vendor + Model)</span></label>
                <input
                  type="text"
                  value={gpuModel}
                  onChange={(e) => setGpuModel(e.target.value)}
                  placeholder="e.g. Sapphire Pulse RX 5600XT"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Assessment Module</label>
                <div className="relative">
                  <select
                    value={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none appearance-none transition-all"
                  >
                    {ASSESSMENT_PROFILES.map(profile => (
                      <option key={profile.id} value={profile.id}>{profile.name}</option>
                    ))}
                  </select>
                  <Settings className="absolute right-3 top-3.5 w-5 h-5 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Active Profile Info */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-8 flex gap-4 items-start">
              <Info className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-white text-sm">Active Module Criteria</h3>
                <p className="text-slate-400 text-sm mb-2">
                  {ASSESSMENT_PROFILES.find(p => p.id === selectedProfileId)?.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {ASSESSMENT_PROFILES.find(p => p.id === selectedProfileId)?.focus_areas.map((area, idx) => (
                    <span key={idx} className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-300">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mb-6 border-t border-slate-800 pt-6">
              <h2 className="text-xl font-bold text-white mb-4">Physical Evidence</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {physicalTypes.map(type => (
                  <UploadZone
                    key={type}
                    type={type}
                    uploadedImage={getImage(type)}
                    onUpload={handleUpload}
                    onRemove={handleRemove}
                    required
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  if(!gpuModel) {
                    setError("Please enter the full GPU name (Vendor + Model).");
                    return;
                  }
                  setStep(AppStep.UPLOAD_PERFORMANCE);
                  setError(null);
                }}
                className="group flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-all shadow-lg shadow-emerald-900/20"
              >
                Next Step
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Performance Upload */}
        {step === AppStep.UPLOAD_PERFORMANCE && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Performance & Authenticity</h1>
              <p className="text-slate-400">Upload screenshots from FurMark and GPU-Z to verify clock speeds, bios versions, and thermal efficiency.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-4xl">
              {performanceTypes.map(type => (
                <UploadZone
                  key={type}
                  type={type}
                  uploadedImage={getImage(type)}
                  onUpload={handleUpload}
                  onRemove={handleRemove}
                  required
                />
              ))}
            </div>

            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 mb-8 max-w-4xl">
              <h3 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
                <FileSearch className="w-4 h-4" />
                Review Assessment Scope
              </h3>
              <div className="flex flex-col gap-2 text-sm text-slate-400">
                 <div className="flex justify-between border-b border-slate-800 pb-2">
                   <span>Target Model:</span>
                   <span className="text-white font-mono">{gpuModel}</span>
                 </div>
                 <div className="flex justify-between border-b border-slate-800 pb-2">
                   <span>Module:</span>
                   <span className="text-white">{ASSESSMENT_PROFILES.find(p => p.id === selectedProfileId)?.name}</span>
                 </div>
                 <div className="flex justify-between pt-1">
                    <span>Evidence Count:</span>
                    <span className="text-white">{images.length} Files</span>
                 </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between max-w-4xl">
               <button 
                 onClick={() => setStep(AppStep.UPLOAD_PHYSICAL)}
                 className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition-all border border-slate-700"
               >
                 <ArrowLeft className="w-4 h-4" />
                 Back to Details
               </button>

               <button
                onClick={startAnalysis}
                disabled={images.length === 0}
                className="group flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all shadow-lg shadow-emerald-900/20"
              >
                Run Assessment Suite
                <Cpu className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Loading */}
        {step === AppStep.ANALYZING && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in duration-500">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
              <Loader2 className="w-16 h-16 text-emerald-400 animate-spin relative z-10" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Analyzing <span className="text-emerald-400">{gpuModel || "Hardware"}</span>
            </h2>
            <p className="text-slate-400 max-w-md mx-auto mb-8">
              Fetching real-time market pricing and cross-referencing visual data with known {gpuModel} defects...
            </p>
            <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 animate-[loading_2s_ease-in-out_infinite]" style={{ width: '50%' }} />
            </div>
            <style>{`
              @keyframes loading {
                0% { transform: translateX(-100%); }
                50% { transform: translateX(100%); }
                100% { transform: translateX(-100%); }
              }
            `}</style>
          </div>
        )}

        {/* Step 4: Results */}
        {step === AppStep.RESULTS && result && (
          <ResultsDashboard data={result} onReset={resetApp} onEdit={handleEdit} />
        )}

      </main>
    </div>
  );
};

export default App;