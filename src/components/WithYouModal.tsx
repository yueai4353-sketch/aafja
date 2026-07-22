import React, { useState, useEffect } from 'react';
import { loadMySchedule, loadOtherSchedule, ScheduleItem } from '../db/youandme';

interface WithYouModalProps {
  isOpen: boolean;
  onClose: () => void;
  myAvatar: string;
  aiAvatar: string;
  moonPhase?: 'full' | 'crescent';
  onMoonPhaseChange?: (phase: 'full' | 'crescent') => void;
}

export const WithYouModal: React.FC<WithYouModalProps> = ({
  isOpen,
  onClose,
  myAvatar,
  aiAvatar,
  moonPhase: externalMoonPhase,
  onMoonPhaseChange
}) => {
  const [activeTab, setActiveTab] = useState<'my' | 'ai'>('ai');
  const [moonPhase, setMoonPhase] = useState<'full' | 'crescent'>(externalMoonPhase || 'full');
  
  useEffect(() => {
    if (externalMoonPhase) {
      setMoonPhase(externalMoonPhase);
    }
  }, [externalMoonPhase]);
  
  const [mySchedule, setMySchedule] = useState<ScheduleItem[]>([]);
  const [aiSchedule, setAiSchedule] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setMySchedule(loadMySchedule());
      setAiSchedule(loadOtherSchedule());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentSchedule = activeTab === 'my' ? mySchedule : aiSchedule;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-[20px] w-[84%] max-w-[320px] shadow-xl overflow-hidden relative flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
          
          {/* Avatars */}
          <div className="relative flex items-center w-[72px] h-12">
            {/* AI Avatar */}
            <div 
              className={`absolute top-0 w-12 h-12 rounded-full border-[2.5px] border-white shadow-sm overflow-hidden cursor-pointer transition-all duration-300 ${activeTab === 'ai' ? 'z-10 left-0' : 'z-0 left-6'}`}
              onClick={() => setActiveTab('ai')}
            >
              {aiAvatar ? (
                <img src={aiAvatar} alt="AI Avatar" className="w-full h-full object-cover bg-gray-100" />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
              )}
            </div>
            
            {/* My Avatar */}
            <div 
              className={`absolute top-0 w-12 h-12 rounded-full border-[2.5px] border-white shadow-sm overflow-hidden cursor-pointer transition-all duration-300 ${activeTab === 'my' ? 'z-10 left-0' : 'z-0 left-6'}`}
              onClick={() => setActiveTab('my')}
            >
              {myAvatar ? (
                <img src={myAvatar} alt="My Avatar" className="w-full h-full object-cover bg-gray-100" />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Moon Button */}
          <button 
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-black/5 transition-colors"
            onClick={() => {
              const newPhase = moonPhase === 'full' ? 'crescent' : 'full';
              setMoonPhase(newPhase);
              if (onMoonPhaseChange) {
                onMoonPhaseChange(newPhase);
              }
            }}
            title={moonPhase === 'full' ? '圆月：AI读取双方日程' : '残月：AI仅读取自己日程'}
          >
            {moonPhase === 'full' ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-yellow-400">
                <circle cx="12" cy="12" r="8" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-yellow-400">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 bg-[#fafafa]">
          <h3 className="text-[15px] font-medium text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-blue-500"></span>
            今日日程
          </h3>
          
          <div className="space-y-3">
            {currentSchedule.length > 0 ? (
              currentSchedule.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-white border border-gray-100/60 shadow-sm rounded-xl">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0"></div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[12px] text-gray-400 mb-1">{item.date} {item.time}</span>
                    <p className="text-[14px] text-gray-700 leading-relaxed break-words whitespace-pre-wrap">{item.text}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <p className="text-[14px]">—请去你我之间添加日程—</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
