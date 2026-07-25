import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface WanhuajiAppProps {
  onBack: () => void;
}

export const WanhuajiApp: React.FC<WanhuajiAppProps> = ({ onBack }) => {
  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-b from-[#fef7f8] to-[#fff0f3] flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 pt-12 pb-4">
        <button onClick={onBack} className="flex items-center text-gray-600 active:text-gray-900 transition-colors">
          <ChevronLeft size={22} />
          <span className="text-[14px] ml-0.5">返回</span>
        </button>
        <h1 className="flex-1 text-center text-[17px] font-bold text-gray-800 mr-8">万花集</h1>
      </div>

      {/* Empty Content */}
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400 text-[14px]">暂无内容</p>
      </div>
    </div>
  );
};
