import React from 'react';
import { X, Camera, Activity, Search, FileJson } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <h2 className="text-2xl font-bold text-white mb-2">How to Verify a GPU</h2>
          <p className="text-slate-400 mb-8">Follow this 3-step process to get an AI-powered assessment of any second-hand graphics card.</p>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                <Camera className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">1. Physical Inspection</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-2">
                  Take clear photos of the GPU from different angles. We analyze these for signs of mining stress, physical damage, or tampering.
                </p>
                <ul className="text-xs text-slate-500 list-disc list-inside space-y-1">
                  <li><strong>Front Shroud:</strong> Fan blades & stickers.</li>
                  <li><strong>Backplate:</strong> Oil leaks from thermal pads.</li>
                  <li><strong>PCIe Fingers:</strong> Scratches or burns.</li>
                </ul>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20">
                <Activity className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">2. Performance Telemetry</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-2">
                  Upload screenshots from standard diagnostic tools to verify authenticity and health.
                </p>
                <ul className="text-xs text-slate-500 list-disc list-inside space-y-1">
                  <li><strong>GPU-Z:</strong> Verifies BIOS version, Subvendor ID, and Shaders.</li>
                  <li><strong>FurMark:</strong> Tests thermal stability under load (run for 5 mins).</li>
                </ul>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                <Search className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">3. AI Analysis & Market Check</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Our Gemini-powered AI cross-references your images with official specs to detect "fake" cards (e.g., flashed BIOS) and scans the live market for accurate pricing.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors"
            >
              Got it, let's start
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};