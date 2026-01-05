import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Plus, Play } from 'lucide-react';

interface ImageUploaderProps {
  onAnalyze: (images: string[]) => void;
  isLoading: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onAnalyze, isLoading }) => {
  const [images, setImages] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      const promises = fileArray.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file as Blob);
        });
      });

      Promise.all(promises).then(newImages => {
        setImages(prev => [...prev, ...newImages]);
      });
    }
    // Reset input to allow selecting the same files again if needed
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyzeClick = () => {
    if (images.length === 0 || isLoading) return;
    // Extract raw base64 strings (remove data:image/xxx;base64, prefix)
    const rawImages = images.map(img => img.split(',')[1]);
    onAnalyze(rawImages);
  };

  const triggerInput = () => {
    if (!isLoading && inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto mb-8 animate-fade-in">
      {/* Main Upload Area */}
      {images.length === 0 ? (
        <div 
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer group
            ${isLoading ? 'border-gray-300 bg-gray-50 cursor-not-allowed' : 'border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-500'}`}
          onClick={triggerInput}
        >
          <input 
            type="file" 
            ref={inputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            multiple
            className="hidden" 
            disabled={isLoading}
          />
          <div className="flex flex-col items-center gap-4 group-hover:scale-105 transition-transform duration-200">
            <div className="p-4 bg-white rounded-full shadow-sm ring-1 ring-indigo-100">
              <Upload className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">Upload Marksheets</p>
              <p className="text-sm text-gray-500 mt-2">Select one or multiple images to analyze in batch</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
           {/* Header actions */}
           <div className="flex items-center justify-between px-2">
             <div className="flex items-center gap-2">
                <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-semibold">
                  {images.length} {images.length === 1 ? 'Image' : 'Images'} Selected
                </div>
                {isLoading && <span className="text-sm text-gray-500 animate-pulse">Processing...</span>}
             </div>
             <button 
               onClick={() => !isLoading && setImages([])} 
               className={`text-sm font-medium transition-colors ${isLoading ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:text-red-700'}`}
               disabled={isLoading}
             >
               Clear All
             </button>
           </div>

           {/* Grid of Images */}
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map((img, idx) => (
                <div key={idx} className="relative group aspect-[3/4] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                   <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                   {!isLoading && (
                     <button 
                       onClick={() => removeImage(idx)}
                       className="absolute top-2 right-2 p-1.5 bg-white/90 text-gray-600 hover:text-red-600 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                     >
                       <X className="w-4 h-4" />
                     </button>
                   )}
                   <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                      <span className="text-xs text-white font-medium opacity-90">Page {idx + 1}</span>
                   </div>
                </div>
              ))}
              
              {/* Add More Button */}
              {!isLoading && (
                <div 
                  onClick={triggerInput}
                  className="aspect-[3/4] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-all"
                >
                   <input 
                      type="file" 
                      ref={inputRef} 
                      onChange={handleFileChange} 
                      accept="image/*" 
                      multiple
                      className="hidden" 
                   />
                   <Plus className="w-8 h-8" />
                   <span className="text-sm font-medium">Add More</span>
                </div>
              )}
           </div>

           {/* Analyze Button */}
           <div className="flex justify-center pt-4">
              <button 
                onClick={handleAnalyzeClick}
                disabled={isLoading}
                className={`
                  flex items-center gap-3 px-8 py-4 rounded-xl shadow-lg shadow-indigo-200 text-lg font-bold transition-all transform
                  ${isLoading 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:scale-105 hover:shadow-xl'
                  }
                `}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing {images.length} Documents...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    Analyze All Images
                  </>
                )}
              </button>
           </div>
        </div>
      )}
    </div>
  );
};