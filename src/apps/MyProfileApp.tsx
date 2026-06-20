import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, ChevronLeft, ChevronRight, Moon, Signal, Wifi, Battery } from 'lucide-react';
import { CurrentTime } from '../components';
import { NetworkManagerScreen } from './CreatePersonaApp';

const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) => (
  <div 
    onClick={() => onChange(!checked)}
    className={`w-12 h-[26px] rounded-full p-[2px] cursor-pointer transition-colors duration-200 ease-in-out ${checked ? 'bg-[#07C160]' : 'bg-[#e5e5e5]'}`}
  >
    <div className={`w-[22px] h-[22px] bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${checked ? 'translate-x-[22px]' : 'translate-x-0'}`} />
  </div>
);

export const MyProfileApp = ({ 
  onBack,
  onSave,
  myProfile,
  personas
}: { 
  onBack: () => void;
  onSave: (profile: any) => void;
  myProfile: any;
  personas?: any[];
  key?: React.Key;
}) => {
  const [detailedTemplate, setDetailedTemplate] = useState(true);
  const [showNetworkManager, setShowNetworkManager] = useState(false);
  
  const [wechatName, setWechatName] = useState(myProfile?.name || '');
  const [wechatId, setWechatId] = useState(myProfile?.wechat_id || '');
  const [signature, setSignature] = useState(myProfile?.signature || '');

  const [realName, setRealName] = useState(myProfile?.real_name || '');
  const [gender, setGender] = useState(myProfile?.gender || '');
  const [age, setAge] = useState(myProfile?.age || '');
  const [birthday, setBirthday] = useState(myProfile?.birthday || '');
  const [identity, setIdentity] = useState(myProfile?.identity || '');
  const [nickname, setNickname] = useState(myProfile?.nickname || '');
  const [personality, setPersonality] = useState(myProfile?.personality || '');
  const [appearance, setAppearance] = useState(myProfile?.appearance || '');
  const [communicationStyle, setCommunicationStyle] = useState(myProfile?.communication_style || '');
  const [lifestyle, setLifestyle] = useState(myProfile?.lifestyle || '');
  const [background, setBackground] = useState(myProfile?.background || '');
  const [nsfwInfo, setNsfwInfo] = useState(myProfile?.nsfw || '');
  const [relationships, setRelationships] = useState<any[]>(myProfile?.relationships || []);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(myProfile?.avatar || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 15 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 bg-[#FAFAFA] z-[100] flex flex-col pt-4"
    >
      {/* Status Bar */}
      <div className="flex justify-between items-center px-7 text-[13px] font-medium text-gray-800 shrink-0 bg-white pb-2">
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
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-white">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-800 active:bg-gray-100 rounded-full transition-colors z-10">
          <ChevronLeft size={24} strokeWidth={2} />
        </button>
        <span className="text-[17px] font-medium text-gray-800 absolute left-1/2 -translate-x-1/2">
          个人信息
        </span>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-[100px] px-4">
        
        {/* Avatar */}
        <div className="flex flex-col items-center justify-center mt-6 mb-8">
          <div className="p-1 border border-dashed border-gray-300 rounded-[20px] mb-2 cursor-pointer transition-opacity active:opacity-70" onClick={() => fileInputRef.current?.click()}>
            <div className="w-[100px] h-[100px] rounded-[16px] bg-[#f2f2f2] flex flex-col items-center justify-center text-gray-400 overflow-hidden relative">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={48} strokeWidth={1.5} className="text-gray-300" />
              )}
            </div>
          </div>
          <span className="text-[13px] text-gray-400" onClick={() => fileInputRef.current?.click()}>点击上传头像</span>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAvatarSelect} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {/* WeChat Info Section */}
        <div className="flex items-center justify-start mb-4 relative px-1">
          <span className="bg-[#f0f0f0] px-4 py-2 text-gray-800 text-[15px] font-medium z-10 w-full text-center tracking-widest rounded-md">微信信息设置</span>
        </div>

        <div className="bg-white rounded-[24px] p-5 mb-8 flex flex-col gap-6">
          <div>
            <label className="block text-[14px] text-gray-700 font-medium mb-2">昵称 *</label>
            <input 
              type="text" 
              value={wechatName}
              onChange={e => setWechatName(e.target.value)}
              placeholder="请输入微信昵称" 
              className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 text-gray-800 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-shadow bg-white" 
            />
          </div>

          <div>
            <label className="block text-[14px] text-gray-700 font-medium mb-2">微信号 *</label>
            <input 
              type="text" 
              value={wechatId}
              onChange={e => setWechatId(e.target.value)}
              placeholder="请输入唯一微信号" 
              className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 text-gray-800 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-shadow bg-white" 
            />
          </div>

          <div>
            <label className="block text-[14px] text-gray-700 font-medium mb-2">个性签名</label>
            <textarea 
              rows={3}
              value={signature}
              onChange={e => setSignature(e.target.value)}
              placeholder="这里的内容会显示在朋友圈头像下方..." 
              className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 text-gray-800 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-shadow bg-white resize-none"
            />
          </div>
        </div>

        {/* Real Persona Section */}
        <div className="flex items-center justify-start mb-4 relative px-1">
          <span className="bg-[#f0f0f0] px-4 py-2 text-gray-800 text-[15px] font-medium z-10 w-full text-center tracking-widest rounded-md">真实人设信息</span>
        </div>

        <div className="bg-white rounded-[24px] p-5 mb-8 flex flex-col gap-6">
          <div className="flex items-center justify-center gap-4 mb-2">
            <span className={`text-[15px] transition-colors ${!detailedTemplate ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>简单模式</span>
            <ToggleSwitch checked={detailedTemplate} onChange={setDetailedTemplate} />
            <span className={`text-[15px] transition-colors ${detailedTemplate ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>详细模式</span>
          </div>

          {detailedTemplate && (
            <div className="flex flex-col gap-6 pt-2">
              <div>
                <label className="block text-[14px] text-gray-700 font-medium mb-2">姓名 (name)</label>
                <input type="text" value={realName} onChange={e => setRealName(e.target.value)} placeholder="例如：李思思" className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 text-gray-800 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-shadow bg-white" />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[14px] text-gray-700 font-medium mb-2">性别 (gender)</label>
                  <input type="text" value={gender} onChange={e => setGender(e.target.value)} placeholder="例如：女、男" className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 text-gray-800 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-shadow bg-white" />
                </div>
                <div className="flex-1">
                  <label className="block text-[14px] text-gray-700 font-medium mb-2">年龄 (age)</label>
                  <input type="text" value={age} onChange={e => setAge(e.target.value)} placeholder="例如：24" className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 text-gray-800 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-shadow bg-white" />
                </div>
              </div>

              <div>
                <label className="block text-[14px] text-gray-700 font-medium mb-2">生日 (birthday)</label>
                <input type="text" value={birthday} onChange={e => setBirthday(e.target.value)} placeholder="例如：1998年5月20日" className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 text-gray-800 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-shadow bg-white" />
              </div>

              <div>
                <label className="block text-[14px] text-gray-700 font-medium mb-2">身份 (identity)</label>
                <input type="text" value={identity} onChange={e => setIdentity(e.target.value)} placeholder="例如：大学生、职场白领、艺术家..." className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 text-gray-800 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-shadow bg-white" />
              </div>

              <div>
                <label className="block text-[14px] text-gray-700 font-medium mb-2">昵称 (nickname)</label>
                <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="例如：小思、思思..." className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 text-gray-800 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-shadow bg-white" />
              </div>

              <div>
                <label className="block text-[14px] text-gray-700 font-medium mb-2">性格 (personality)</label>
                <textarea rows={3} value={personality} onChange={e => setPersonality(e.target.value)} placeholder="描述性格特点，例如：开朗活泼、温柔体贴、内向文静..." className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 text-gray-800 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-shadow bg-white resize-none"></textarea>
              </div>

              <div>
                <label className="block text-[14px] text-gray-700 font-medium mb-2">外观 (appearance)</label>
                <textarea rows={3} value={appearance} onChange={e => setAppearance(e.target.value)} placeholder="描述外貌特征，例如：身高、发型、穿着风格..." className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 text-gray-800 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-shadow bg-white resize-none"></textarea>
              </div>

              <div>
                <label className="block text-[14px] text-gray-700 font-medium mb-2">沟通风格 (communication_style)</label>
                <textarea rows={3} value={communicationStyle} onChange={e => setCommunicationStyle(e.target.value)} placeholder="描述说话方式，例如：喜欢用语气词、经常开玩笑、表达直接..." className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 text-gray-800 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-shadow bg-white resize-none"></textarea>
              </div>

              <div>
                <label className="block text-[14px] text-gray-700 font-medium mb-2">生活习惯 (lifestyle)</label>
                <textarea rows={3} value={lifestyle} onChange={e => setLifestyle(e.target.value)} placeholder="描述日常生活习惯，例如：早起、喜欢运动、爱猫咪、夜猫子..." className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 text-gray-800 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-shadow bg-white resize-none"></textarea>
              </div>

              <div>
                <label className="block text-[14px] text-gray-700 font-medium mb-2">成长经历 (background)</label>
                <textarea rows={3} value={background} onChange={e => setBackground(e.target.value)} placeholder="描述成长背景、重要经历..." className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 text-gray-800 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-shadow bg-white resize-none"></textarea>
              </div>

              <div>
                <label className="block text-[14px] text-gray-700 font-medium mb-2">NSFW相关 (nsfw_info)</label>
                <textarea rows={3} value={nsfwInfo} onChange={e => setNsfwInfo(e.target.value)} placeholder="选填，描述NSFW相关偏好和特征..." className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 text-gray-800 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-shadow bg-white resize-none"></textarea>
              </div>
            </div>
          )}
        </div>

        {/* Relationship Network */}
        <div className="flex items-center justify-center mb-4 relative">
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
          <span className="bg-[#FAFAFA] px-3 text-gray-500 text-[13px] tracking-widest z-10 font-light">关系网</span>
        </div>

        <div className="bg-white rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-100/60 mb-8 flex flex-col overflow-hidden">
          <div 
             className="px-5 py-4 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors"
             onClick={() => setShowNetworkManager(true)}
          >
             <div className="flex flex-col">
               <span className="text-[15px] text-gray-800 font-medium mb-1">管理TA的关系网</span>
               <span className="text-[12px] text-gray-400">为这个角色添加家人、朋友、同事等关系</span>
             </div>
             <ChevronRight size={18} className="text-gray-400" />
          </div>
        </div>

      </div>

      <div className="absolute bottom-0 w-full bg-white border-t border-gray-100 px-5 pt-3 pb-8 flex gap-4 z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
        <button 
          onClick={() => {
            onSave({ 
              name: wechatName.trim(), 
              wechat_id: wechatId, 
              signature,
              real_name: realName,
              gender,
              age,
              birthday,
              identity,
              nickname,
              personality,
              appearance,
              communication_style: communicationStyle,
              lifestyle,
              background,
              nsfw: nsfwInfo,
              avatar: avatarPreview,
              relationships
            });
          }}
          className="flex-1 bg-[#2C2C2E] active:bg-[#1A1A1C] text-white text-[15px] font-medium py-3.5 rounded-[14px] transition-colors shadow-sm"
        >
          保存
        </button>
      </div>

      <AnimatePresence>
        {showNetworkManager && (
          <NetworkManagerScreen 
            onClose={() => setShowNetworkManager(false)}
            relationships={relationships}
            setRelationships={setRelationships}
            personaName={realName || wechatName || '我'}
            personas={personas || []}
            selfId={'my_profile'}
          />
        )}
      </AnimatePresence>

    </motion.div>
  );
};
