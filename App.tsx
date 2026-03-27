import React, { useState } from 'react';
import { UploadedImage, ImageType, AppStep, GPUAssessmentResult, ASSESSMENT_PROFILES } from './types';
import { analyzeGPU } from './services/geminiService';
import { UploadZone } from './components/UploadZone';
import { ResultsDashboard } from './components/ResultsDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GuideModal } from './components/GuideModal';
import { Cpu, ChevronRight, Loader2, FileSearch, Settings, Info, FlaskConical, ArrowLeft, HelpCircle, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD_PHYSICAL);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<GPUAssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [isColdStarting, setIsColdStarting] = useState(false);

  const [gpuModel, setGpuModel] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState(ASSESSMENT_PROFILES[0].id);
  const [useMockMode, setUseMockMode] = useState(false); // Mock mode to save RPD/RPM

  const handleUpload = (type: ImageType, file: File) => {
    const newImage: UploadedImage = {
      id: Math.random().toString(36).substr(2, 9),
      file,
      previewUrl: URL.createObjectURL(file),
      type
    };
    setImages(prev => [...prev.filter(img => img.type !== type), newImage]);
  };

  const handleRemove = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const startAnalysis = async (useMockMode: boolean = false) => {
    if (!gpuModel.trim()) {
      setError("Please specify the full GPU name (Vendor + Model).");
      setStep(AppStep.UPLOAD_PHYSICAL);
      return;
    }

    setStep(AppStep.ANALYZING);
    setIsAnalyzing(true);
    setError(null);
    setIsColdStarting(false);

    try {
      console.log("Starting analysis with", images.length, "images");
      const result = await analyzeGPU(images, gpuModel, selectedProfileId, useMockMode);
      console.log("Analysis result:", result);
      setResult(result);
      setStep(AppStep.RESULTS);
    } catch (err: any) {
      console.error("Analysis error:", err);
      setError(err.message || "An unexpected error occurred during analysis.");
      setStep(AppStep.UPLOAD_PERFORMANCE); 
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
      "GIGABYTE AORUS RTX 3070 Master"
    ];
    const randomModel = demoModels[Math.floor(Math.random() * demoModels.length)];
    setGpuModel(randomModel);
    setSelectedProfileId(randomModel.includes("4090") ? "rtx_40_series" : "universal");

    const base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    const res = await fetch(`data:image/png;base64,${base64}`);
    const blob = await res.blob();

    const demoTypes = [
      ImageType.FRONT_SHROUD, ImageType.BACKPLATE, ImageType.IO_SHIELD,
      ImageType.PCIE_LANES, ImageType.FURMARK, ImageType.GPUZ
    ];

    const newImages = demoTypes.map(type => ({
      id: Math.random().toString(36).substr(2, 9),
      file: new File([blob], `demo_${type}.png`, { type: "image/png" }),
      previewUrl: URL.createObjectURL(blob),
      type
    }));

    setImages(newImages);
    setStep(AppStep.UPLOAD_PERFORMANCE);
  };

  const getImage = (type: ImageType) => images.find(img => img.type === type);

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
               <span className={step === AppStep.UPLOAD_PHYSICAL ? "text-emerald-400" : ""}>1. Details</span>
               <ChevronRight className="w-4 h-4 text-slate-700" />
               <span className={step === AppStep.UPLOAD_PERFORMANCE ? "text-emerald-400" : ""}>2. Evidence</span>
               <ChevronRight className="w-4 h-4 text-slate-700" />
               <span className={step >= AppStep.ANALYZING ? "text-emerald-400" : ""}>3. Results</span>
            </div>
            <button onClick={() => setShowGuide(true)} className="p-2 text-slate-400 hover:text-emerald-400 rounded-full transition-colors">
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {error && (
          <div className={`mb-8 p-4 rounded-lg flex items-center gap-3 border ${isColdStarting ? 'bg-amber-500/10 border-amber-500/50 text-amber-200' : 'bg-rose-500/10 border-rose-500/50 text-rose-300'}`}>
            <AlertCircle className={`w-5 h-5 ${isColdStarting ? 'text-amber-400' : 'text-rose-400'}`} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {step === AppStep.UPLOAD_PHYSICAL && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">GPU Configuration</h1>
                <p className="text-slate-400">Specify the hardware details for the AI-driven market and visual audit.</p>
              </div>
              <button onClick={loadDemoData} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-emerald-400 transition-colors">
                <FlaskConical className="w-4 h-4" />
                <span>Quick Test</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Target GPU Model</label>
                <input
                  type="text"
                  value={gpuModel}
                  onChange={(e) => setGpuModel(e.target.value)}
                  placeholder="e.g. MSI RTX 3070 Gaming X Trio"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Assessment Module</label>
                <div className="relative">
                  <select
                    value={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white appearance-none outline-none"
                  >
                    {ASSESSMENT_PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <Settings className="absolute right-3 top-3.5 w-5 h-5 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="mb-6 border-t border-slate-800 pt-6">
              <h2 className="text-xl font-bold text-white mb-4">Physical Condition Photos <span className="text-sm font-normal text-slate-400">(Required: Front & Backplate)</span></h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <UploadZone type={ImageType.FRONT_SHROUD} uploadedImage={getImage(ImageType.FRONT_SHROUD)} onUpload={handleUpload} onRemove={handleRemove} required />
                <UploadZone type={ImageType.BACKPLATE} uploadedImage={getImage(ImageType.BACKPLATE)} onUpload={handleUpload} onRemove={handleRemove} required />
                <UploadZone type={ImageType.IO_SHIELD} uploadedImage={getImage(ImageType.IO_SHIELD)} onUpload={handleUpload} onRemove={handleRemove} />
                <UploadZone type={ImageType.PCIE_LANES} uploadedImage={getImage(ImageType.PCIE_LANES)} onUpload={handleUpload} onRemove={handleRemove} />
                <UploadZone type={ImageType.POWER_CONNECTOR} uploadedImage={getImage(ImageType.POWER_CONNECTOR)} onUpload={handleUpload} onRemove={handleRemove} />
                <UploadZone type={ImageType.HEATSINK} uploadedImage={getImage(ImageType.HEATSINK)} onUpload={handleUpload} onRemove={handleRemove} />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => gpuModel ? setStep(AppStep.UPLOAD_PERFORMANCE) : setError("Please enter a GPU model.")}
                className="group flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-all shadow-lg"
              >
                Next Step <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {step === AppStep.UPLOAD_PERFORMANCE && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Technical Evidence</h1>
              <p className="text-slate-400">Upload benchmarks and GPU-Z screenshots for authenticity and thermal validation.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-4xl">
              <UploadZone type={ImageType.FURMARK} uploadedImage={getImage(ImageType.FURMARK)} onUpload={handleUpload} onRemove={handleRemove} required />
              <UploadZone type={ImageType.GPUZ} uploadedImage={getImage(ImageType.GPUZ)} onUpload={handleUpload} onRemove={handleRemove} required />
            </div>

            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 mb-8 max-w-4xl">
              <h3 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
                <FileSearch className="w-4 h-4" /> Assessment Summary
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                 <div className="text-slate-400">Target: <span className="text-white ml-2">{gpuModel}</span></div>
                 <div className="text-slate-400">Files: <span className="text-white ml-2">{images.length}</span></div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={useMockMode} 
                    onChange={(e) => setUseMockMode(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-300">Mock Mode (Save RPD/RPM - uses fake data)</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between max-w-4xl">
               <button onClick={() => setStep(AppStep.UPLOAD_PHYSICAL)} className="px-6 py-3 bg-slate-800 text-slate-300 rounded-lg font-semibold border border-slate-700">
                 Back
               </button>
               <button onClick={() => startAnalysis(useMockMode)} disabled={images.length < 4} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-semibold shadow-lg">
                 {useMockMode ? "Run Mock Test" : "Run AI Verification"}
               </button>
            </div>
          </div>
        )}

        {step === AppStep.ANALYZING && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in duration-500">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
              <Loader2 className="w-16 h-16 text-emerald-400 animate-spin relative z-10" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Analyzing {gpuModel}</h2>
            <p className="text-slate-400 max-w-md mx-auto mb-8">
              Performing live market search and cross-referencing visual telemetry with official manufacturer specs...
            </p>
            <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 animate-[loading_2s_ease-in-out_infinite]" style={{ width: '50%' }} />
            </div>
          </div>
        )}

        {step === AppStep.RESULTS && (
          result ? (
            <ErrorBoundary fallback={<div className="text-white p-8">Error displaying results. Check console for details.</div>}>
              <ResultsDashboard data={result} gpuModel={gpuModel} onReset={resetApp} onEdit={handleEdit} />
            </ErrorBoundary>
          ) : (
            <div className="text-white p-8">
              <p>No result data available</p>
            </div>
          )
        )}
      </main>
      <style>{`@keyframes loading { 0% { transform: translateX(-100%); } 50% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }`}</style>
    </div>
  );
};

export default App;
