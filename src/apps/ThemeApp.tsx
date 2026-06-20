import React, { useRef } from 'react';
import { ChevronLeft } from 'lucide-react';

interface ThemeAppProps {
  onBack: () => void;
  desktopBg: string | null;
  onUpdateDesktopBg: (bg: string | null) => void;
}

export const ThemeApp: React.FC<ThemeAppProps> = ({ onBack, desktopBg, onUpdateDesktopBg }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        onUpdateDesktopBg(result);
        localStorage.setItem('desktopBg', result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-neutral-50 flex flex-col animate-in slide-in-from-right-full duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 active:bg-gray-100 rounded-full transition-colors flex items-center justify-center">
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
        <span className="font-medium text-[16px] text-gray-800 absolute left-1/2 -translate-x-1/2">
          主题设置
        </span>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="bg-gray-50 px-5 py-4 border-b border-gray-100">
            <h2 className="text-[18px] font-bold text-gray-800">壁纸设置</h2>
          </div>

          <div className="flex flex-col items-center p-6">
            <span className="text-[15px] text-gray-600 font-medium mb-4">主屏壁纸</span>
            
            <div 
              className="w-full aspect-[5/3] rounded-[16px] border border-gray-200 bg-[#f5f5f5] flex flex-col items-center justify-center relative overflow-hidden mb-4"
            >
              {desktopBg ? (
                <img src={desktopBg} alt="当前壁纸" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[14px] text-gray-400 font-medium">当前壁纸</span>
              )}
            </div>

            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 rounded-[12px] border border-gray-300 bg-white text-[15px] font-medium text-gray-800 active:bg-gray-50 transition-colors"
            >
              更换
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              className="hidden" 
              accept="image/*" 
            />
          </div>
        </div>
      </div>
    </div>
  );
};
