import React, { useState, useRef } from 'react';

export const ProfileCard = () => {
  const [avatar, setAvatar] = useState<string | null>(() => localStorage.getItem('profile_card_avatar'));
  const [name, setName] = useState<string>(() => localStorage.getItem('profile_card_name') || 'Drift.log');
  const [status1, setStatus1] = useState<string>(() => localStorage.getItem('profile_card_status1') || 'echo ~ fading');
  const [status2, setStatus2] = useState<string>(() => localStorage.getItem('profile_card_status2') || 'signal 🐈 : weak ✧');
  const [status3, setStatus3] = useState<string>(() => localStorage.getItem('profile_card_status3') || '○ still listening');
  
  const [image1, setImage1] = useState<string | null>(() => localStorage.getItem('profile_card_image1'));
  const [image2, setImage2] = useState<string | null>(() => localStorage.getItem('profile_card_image2'));

  const fileInputRefAvatar = useRef<HTMLInputElement>(null);
  const fileInputRefImage1 = useRef<HTMLInputElement>(null);
  const fileInputRefImage2 = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void, key: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setter(result);
        localStorage.setItem(key, result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTextEdit = (setter: (v: string) => void, key: string) => {
    const newVal = prompt('Edit text:');
    if (newVal !== null && newVal.trim() !== '') {
      setter(newVal.trim());
      localStorage.setItem(key, newVal.trim());
    }
  };

  return (
    <div className="w-full aspect-square bg-white/20 backdrop-blur-2xl rounded-[28px] sm:rounded-[36px] shadow-[0_8px_32px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_0_20px_rgba(255,255,255,0.1)] border border-white/30 backdrop-saturate-150 flex flex-col p-3 sm:p-5 relative overflow-hidden box-border">
      {/* Top section */}
      <div className="flex flex-row items-start w-full gap-2 sm:gap-3 flex-1 min-h-0 pt-1">
        {/* Avatar */}
        <div className="flex flex-col items-center pl-1">
          <div 
            className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-white/30 backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.06),0_0_0_3px_rgba(255,255,255,0.6)] sm:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_0_0_4px_rgba(255,255,255,0.6)] flex-shrink-0 cursor-pointer overflow-hidden flex items-center justify-center relative mt-1"
            onClick={(e) => { e.stopPropagation(); fileInputRefAvatar.current?.click(); }}
          >
            <input type="file" ref={fileInputRefAvatar} onChange={(e) => handleImageUpload(e, setAvatar, 'profile_card_avatar')} className="hidden" accept="image/*" />
            {avatar ? (
              <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/20 flex flex-col items-center justify-center relative overflow-hidden">
                 <div className="w-[38%] h-[38%] bg-white/60 rounded-full mb-[5%]"></div>
                 <div className="w-[75%] h-[50%] bg-white/60 rounded-t-full absolute bottom-[-10%]"></div>
              </div>
            )}
          </div>
        </div>

        {/* Texts */}
        <div className="flex flex-col justify-start flex-1 min-w-0 pl-1 sm:pl-2 pr-1 overflow-hidden h-full select-none">
          <div 
            className="text-[#3a3a3a] font-bold text-[12px] sm:text-[14px] md:text-[15px] truncate cursor-pointer hover:opacity-80 transition-opacity text-left tracking-widest font-sans mb-1.5 sm:mb-2 mt-1 sm:mt-1.5"
            onClick={(e) => { e.stopPropagation(); handleTextEdit(setName, 'profile_card_name'); }}
          >
            {name}
          </div>
          <div className="flex flex-col items-start justify-between flex-1 pb-1">
            <div 
              className="text-[#4a4a4a] text-[9px] sm:text-[11px] md:text-[12px] font-bold cursor-pointer hover:opacity-80 transition-opacity truncate w-full text-left tracking-wider"
              onClick={(e) => { e.stopPropagation(); handleTextEdit(setStatus1, 'profile_card_status1'); }}
            >
              {status1}
            </div>
            <div 
              className="text-[#4a4a4a] text-[9px] sm:text-[11px] md:text-[12px] font-bold cursor-pointer hover:opacity-80 transition-opacity truncate w-full text-left tracking-wider"
              onClick={(e) => { e.stopPropagation(); handleTextEdit(setStatus2, 'profile_card_status2'); }}
            >
              {status2}
            </div>
            <div 
              className="text-[#4a4a4a] text-[9px] sm:text-[11px] md:text-[12px] font-bold cursor-pointer hover:opacity-80 transition-opacity truncate w-full text-left flex items-center justify-start gap-1 tracking-wider"
              onClick={(e) => { e.stopPropagation(); handleTextEdit(setStatus3, 'profile_card_status3'); }}
            >
              {status3}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section - Images */}
      <div className="flex flex-row justify-between w-full h-[40%] gap-2 sm:gap-3 px-1 pb-1 mt-1 sm:mt-2">
        <div 
          className="flex-1 bg-white/30 backdrop-blur-lg rounded-[16px] sm:rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] overflow-hidden cursor-pointer flex items-center justify-center p-[2px] sm:p-[3px] border border-white/40 relative group"
          onClick={(e) => { e.stopPropagation(); fileInputRefImage1.current?.click(); }}
        >
          <input type="file" ref={fileInputRefImage1} onChange={(e) => handleImageUpload(e, setImage1, 'profile_card_image1')} className="hidden" accept="image/*" />
          <div className="w-full h-full rounded-[14px] sm:rounded-[18px] overflow-hidden bg-white/20 flex items-center justify-center relative">
            {image1 ? (
                <img src={image1} alt="image1" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
                <div className="text-gray-400/80 font-medium text-[10px] sm:text-xs text-center leading-tight">点击<br/>添加</div>
            )}
          </div>
        </div>
        <div 
          className="flex-1 bg-white/30 backdrop-blur-lg rounded-[16px] sm:rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] overflow-hidden cursor-pointer flex items-center justify-center p-[2px] sm:p-[3px] border border-white/40 relative group"
          onClick={(e) => { e.stopPropagation(); fileInputRefImage2.current?.click(); }}
        >
          <input type="file" ref={fileInputRefImage2} onChange={(e) => handleImageUpload(e, setImage2, 'profile_card_image2')} className="hidden" accept="image/*" />
          <div className="w-full h-full rounded-[14px] sm:rounded-[18px] overflow-hidden bg-white/20 flex items-center justify-center relative">
            {image2 ? (
                <img src={image2} alt="image2" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
                <div className="text-gray-400/80 font-medium text-[10px] sm:text-xs text-center leading-tight">点击<br/>添加</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
