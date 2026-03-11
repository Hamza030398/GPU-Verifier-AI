import React, { useRef } from 'react';
import { 
  Upload, X, CheckCircle, 
  Fan, ScanBarcode, Cable, MemoryStick, Zap, Thermometer, Flame, FileSpreadsheet 
} from 'lucide-react';
import { ImageType, UploadedImage, IMAGE_LABELS, IMAGE_INSTRUCTIONS } from '../types';

interface UploadZoneProps {
  type: ImageType;
  uploadedImage?: UploadedImage;
  onUpload: (type: ImageType, file: File) => void;
  onRemove: (id: string) => void;
  required?: boolean;
}

// Helper to resize image before sending to AI (Critical for HF Free Tier)
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024; // Optimal for Qwen2.5-VL
        const scaleSize = MAX_WIDTH / img.width;
        
        if (img.width > MAX_WIDTH) {
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file); // Fallback to original
          }
        }, 'image/jpeg', 0.8); // 80% quality is plenty for OCR/Vision
      };
    };
  });
};

const getIconForType = (type: ImageType) => {
  switch (type) {
    case ImageType.FRONT_SHROUD: return Fan;
    case ImageType.BACKPLATE: return ScanBarcode;
    case ImageType.IO_SHIELD: return Cable;
    case ImageType.PCIE_LANES: return MemoryStick;
    case ImageType.POWER_CONNECTOR: return Zap;
    case ImageType.HEATSINK: return Thermometer;
    case ImageType.FURMARK: return Flame;
    case ImageType.GPUZ: return FileSpreadsheet;
    default: return Upload;
  }
};

export const UploadZone: React.FC<UploadZoneProps> = ({ type, uploadedImage, onUpload, onRemove, required }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const TypeIcon = getIconForType(type);

  const processAndUpload = async (file: File) => {
    // Only compress if it's an image
    if (file.type.startsWith('image/')) {
      const optimizedFile = await compressImage(file);
      onUpload(type, optimizedFile);
    } else {
      onUpload(type, file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processAndUpload(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processAndUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="relative group flex flex-col h-full">
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
            {required && <span className="text-rose-500">*</span>}
            {IMAGE_LABELS[type]}
          </label>
          {uploadedImage && <CheckCircle className="w-4 h-4 text-emerald-500" />}
        </div>
        <p className="text-xs text-slate-500 leading-tight min-h-[2.5em]">
          {IMAGE_INSTRUCTIONS[type]}
        </p>
      </div>

      <div
        onClick={() => !uploadedImage && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`
          relative w-full aspect-video rounded-lg border-2 border-dashed transition-all duration-200 overflow-hidden cursor-pointer flex-grow
          ${uploadedImage 
            ? 'border-emerald-500/50 bg-slate-900' 
            : 'border-slate-700 bg-slate-800/50 hover:border-emerald-500/50 hover:bg-slate-800'}
        `}
      >
        {uploadedImage ? (
          <>
            <img 
              src={uploadedImage.previewUrl} 
              alt={type} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(uploadedImage.id);
                }}
                className="p-2 bg-rose-500 rounded-full hover:bg-rose-600 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 group-hover:text-emerald-400 transition-colors p-4 text-center">
            <TypeIcon className="w-10 h-10 mb-3 opacity-80" />
            <span className="text-xs uppercase tracking-wider font-semibold">
              Drop {IMAGE_LABELS[type]}
            </span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      
      {!uploadedImage && (
        <p className="mt-2 text-[10px] text-center text-slate-600">
          Click or drop file (Max 1024px)
        </p>
      )}
    </div>
  );
};
