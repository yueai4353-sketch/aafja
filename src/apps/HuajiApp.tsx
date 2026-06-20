import React from 'react';
import { motion } from 'motion/react';
import { Moon, Signal, Wifi, Battery, ChevronLeft, RefreshCcw, Plus, User } from 'lucide-react';
import { CurrentTime } from '../components';

export const HuajiApp = ({ onBack, onCreatePersona, onEditPersona, personas, key }: { onBack: () => void, onCreatePersona: () => void, onEditPersona: (p: any) => void, personas: any[], key?: React.Key }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 15 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 bg-[#f9f9f9] z-[60] flex flex-col pt-4"
    >
      {/* Status Bar */}
      <div className="flex justify-between items-center px-7 text-[13px] font-medium text-gray-800 shrink-0">
        <div className="flex items-center">
          <CurrentTime /> <Moon size={11} className="ml-1 opacity-80" fill="currentColor" strokeWidth={1} />
        </div>
        <div className="flex items-center gap-1.5 opacity-60">
          <Signal size={14} strokeWidth={2.5} />
          <Wifi size={14} strokeWidth={2.5} />
          <Battery size={16} strokeWidth={2} />
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 mt-2 border-b border-gray-100 bg-white">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-800 active:bg-gray-100 rounded-full transition-colors z-10">
          <ChevronLeft size={24} strokeWidth={2} />
        </button>
        <span className="text-[17px] font-medium text-gray-800 absolute left-1/2 -translate-x-1/2">
          花集
        </span>
        <button className="p-2 -mr-2 text-[#ffb5c5] active:bg-gray-100 rounded-full transition-colors z-10">
          <RefreshCcw size={20} className="opacity-80" strokeWidth={2} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
        {/* Top Cards */}
        <div className="flex gap-3 px-4 pt-5 pb-3 overflow-x-auto no-scrollbar">
          {/* Create Persona Card */}
          <div 
            onClick={onCreatePersona}
            className="shrink-0 w-[110px] h-[110px] rounded-[18px] border-[1.5px] border-dashed border-[#dcdcdc] bg-white flex flex-col items-center justify-center text-[#999999] active:bg-gray-50 cursor-pointer"
          >
            <Plus size={28} strokeWidth={1.5} className="mb-2 text-[#aaaaaa]" />
            <span className="text-[13px] font-light tracking-wide">创建人设</span>
          </div>
          
          {personas.length === 0 ? (
            /* None Custom Persona Card */
            <div className="flex-1 min-w-[200px] h-[110px] rounded-[18px] border border-gray-100/80 bg-white flex flex-col items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.02)] text-center">
              <span className="text-[14px] text-gray-500 font-medium mb-2 tracking-wider">暂无自定义人设</span>
              <span className="text-[12px] text-[#cccccc] font-light tracking-wider">点击左侧+号创建</span>
            </div>
          ) : (
            personas.map(p => (
              <div key={p.id} onClick={() => onEditPersona(p)} className="shrink-0 w-[110px] h-[110px] rounded-[18px] border border-gray-100/80 bg-white flex flex-col items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.02)] text-center relative overflow-hidden cursor-pointer active:bg-gray-50">
                <div className="w-[52px] h-[52px] bg-gradient-to-br from-[#f8f9fa] to-[#e9ecef] rounded-full flex items-center justify-center mb-2 shadow-inner overflow-hidden">
                   {p.avatar ? <img src={p.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <User size={24} className="text-gray-400" />}
                </div>
                <span className="text-[13px] text-gray-700 font-medium truncate w-full px-2">{p.name}</span>
              </div>
            ))
          )}
        </div>

        {/* Favorite Personas Card */}
        <div className="mx-4 mt-2 mb-20 rounded-[18px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-100/80">
          <div className="bg-[#FCF0F4] px-5 py-3.5 flex items-center text-[14px] text-gray-700 font-medium tracking-wide">
            <span className="mr-1.5 opacity-90 drop-shadow-sm">💖</span> 喜欢的人设
          </div>
          <div className="bg-white py-10 flex flex-col items-center justify-center text-center">
            <span className="text-[14px] text-gray-500 font-medium mb-2 tracking-wider">暂无喜欢的人设</span>
            <span className="text-[12px] text-[#cccccc] font-light tracking-wider">点击下方卡片❤收藏</span>
          </div>
        </div>

        {/* Dice Section */}
        <div className="flex flex-col items-center justify-center mt-32">
          <div className="w-[60px] h-[60px] rounded-2xl flex items-center justify-center mb-5 opacity-90">
             <span className="text-[60px] drop-shadow-sm leading-none grayscale-[0.5] opacity-80 mix-blend-multiply">🎲</span>
          </div>
          <span className="text-[14px] text-[#aaaaaa] font-medium tracking-wider mb-2">点击右上角刷新按钮</span>
          <span className="text-[12px] text-[#cccccc] font-light tracking-wider">生成AI交友卡片</span>
        </div>
      </div>
    </motion.div>
  );
};
