import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Moon, Signal, Wifi, Battery, ChevronLeft, User, ChevronRight, Plus, X, Check } from 'lucide-react';
import { ToggleSwitch, CurrentTime } from '../components';

export const CreatePersonaApp = ({ 
  onBack,
  onSave,
  initialData,
  personas = [],
  key
}: { 
  onBack: () => void;
  onSave: (persona: any, sendReq: boolean) => void;
  initialData?: any;
  personas?: any[];
  key?: React.Key;
}) => {
  const [sendRequest, setSendRequest] = useState(false);
  const [detailedTemplate, setDetailedTemplate] = useState(initialData ? initialData.mode !== 'normal' : true);
  const [enableMask, setEnableMask] = useState(initialData?.enableMask || false);
  const [wechatName, setWechatName] = useState(initialData?.wechatName || initialData?.wechat_name || initialData?.name || '');
  const [wechatId, setWechatId] = useState(initialData?.wechatId || initialData?.wechat_id || '');
  const [region, setRegion] = useState(initialData?.region || '');
  
  const [signature, setSignature] = useState(initialData?.signature || '');
  const [realName, setRealName] = useState(initialData?.name || initialData?.real_name || '');
  const [bio, setBio] = useState(initialData?.bio || '');
  const [gender, setGender] = useState(initialData?.gender || '');
  const [age, setAge] = useState(initialData?.age || '');
  const [birthday, setBirthday] = useState(initialData?.birthday || '');
  const [identity, setIdentity] = useState(initialData?.identity || '');
  const [nickname, setNickname] = useState(initialData?.nickname || '');
  const [personality, setPersonality] = useState(initialData?.personality || '');
  const [appearance, setAppearance] = useState(initialData?.appearance || '');
  const [relationship, setRelationship] = useState(initialData?.relationship || '');
  const [communicationStyle, setCommunicationStyle] = useState(initialData?.communication_style || '');
  const [lifestyle, setLifestyle] = useState(initialData?.lifestyle || '');
  const [background, setBackground] = useState(initialData?.background || '');
  const [nsfwInfo, setNsfwInfo] = useState(initialData?.nsfw_info || initialData?.nsfw || '');

  const [relationships, setRelationships] = useState<any[]>(initialData?.relationships || []);
  const [showNetworkManager, setShowNetworkManager] = useState(false);

  const [linkedWorldbooks, setLinkedWorldbooks] = useState<string[]>(initialData?.linkedWorldbooks || initialData?.linked_worldbooks || []);
  const [showWorldbookSelect, setShowWorldbookSelect] = useState(false);
  const [allWorldbooks, setAllWorldbooks] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('os_worldbooks');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const handleToggleWorldbook = (bookId: string) => {
    setLinkedWorldbooks(prev => 
      prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]
    );
  };

  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData?.avatar || null);
  const [myAvatarPreview, setMyAvatarPreview] = useState<string | null>(initialData?.my_bound_avatar || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const myFileInputRef = useRef<HTMLInputElement>(null);

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

  const handleMyAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMyAvatarPreview(reader.result as string);
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
      className="absolute inset-0 bg-[#FAFAFA] z-[70] flex flex-col pt-4"
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
      <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-gray-100 bg-white">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-800 active:bg-gray-100 rounded-full transition-colors z-10">
          <ChevronLeft size={24} strokeWidth={2} />
        </button>
        <span className="text-[17px] font-medium text-gray-800 absolute left-1/2 -translate-x-1/2">
          对方人设
        </span>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-[100px] px-4">
        
        {/* Wechat Section */}
        <div className="flex items-center justify-center mt-6 mb-4 relative">
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
          <span className="bg-[#FAFAFA] px-3 text-gray-500 text-[13px] tracking-widest z-10 font-light">微信信息</span>
        </div>

        <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-100/60 mb-4 flex flex-col gap-6">
          {/* Avatar */}
          <div>
            <label className="block text-[14px] text-gray-700 font-medium mb-3">头像 (avatar)</label>
            <div className="flex items-center gap-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-[72px] h-[72px] rounded-[18px] bg-[#f8f9fa] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 cursor-pointer overflow-hidden relative"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={36} strokeWidth={1.5} className="mb-0.5" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] text-gray-700 font-medium">点击头像上传</span>
                <span className="text-[12px] text-gray-400 mt-1">此头像将作为该人设的微信头像</span>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarSelect} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          </div>

          {/* Wechat Name */}
          <div>
            <label className="block text-[14px] text-gray-700 font-medium mb-2">微信昵称 (wechat_name)</label>
            <input 
              type="text" 
              value={wechatName}
              onChange={e => setWechatName(e.target.value)}
              placeholder="设置微信显示的昵称" 
              className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 text-gray-800 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-shadow bg-white" 
            />
            <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
              此昵称为该人设在微信中的显示名称，将在通讯录、聊天列表、聊天窗口、朋友圈等所有微信功能中显示
            </p>
          </div>

          {/* Wechat ID */}
          <div>
            <label className="block text-[14px] text-gray-700 font-medium mb-2">微信号 (wechat_id)</label>
            <input type="text" value={wechatId} onChange={e => setWechatId(e.target.value)} placeholder="设置此人设的微信号，可在微信搜索添加" className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 text-gray-800 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-shadow bg-white" />
          </div>

          {/* Region */}
          <div>
            <label className="block text-[14px] text-gray-700 font-medium mb-2">地区 (region)</label>
            <input type="text" value={region} onChange={e => setRegion(e.target.value)} placeholder="留空则使用天气设置的城市" className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 text-gray-800 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-shadow bg-white" />
            <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">填写该角色所在城市，留空表示与你同城</p>
          </div>

          {/* Signature */}
          <div>
            <label className="block text-[14px] text-gray-700 font-medium mb-2">个性签名 (signature)</label>
            <input type="text" value={signature} onChange={e => setSignature(e.target.value)} placeholder="例如：热爱生活，享受当下" className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 text-gray-800 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-shadow bg-white" />
            <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">此签名将显示在微信资料中，可选填</p>
          </div>
        </div>

        {/* Save Toggle */}
        <div className="bg-[#F8FBFF] rounded-[24px] p-5 border border-[#E8F0FE] mb-8 flex items-center justify-between">
          <div className="flex flex-col pr-4">
             <span className="text-[15px] text-gray-800 font-medium mb-1.5 ml-1">保存后主动发送好友申请</span>
             <span className="text-[12px] text-gray-500 leading-relaxed ml-1">开启后，AI将扮演此人设主动向你发送好友申请</span>
          </div>
          <ToggleSwitch checked={sendRequest} onChange={setSendRequest} />
        </div>

        {/* Persona Section */}
        <div className="flex items-center justify-center mb-4 relative">
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
          <span className="bg-[#FAFAFA] px-3 text-gray-500 text-[13px] tracking-widest z-10 font-light">人设信息</span>
        </div>

        <div className="bg-white rounded-[24px] px-5 py-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-100/60 mb-8 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-5">
             <span className="text-[15px] text-gray-800 font-medium ml-1">详细模板</span>
             <ToggleSwitch checked={detailedTemplate} onChange={setDetailedTemplate} />
          </div>

          {detailedTemplate ? (
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
                <label className="block text-[14px] text-gray-700 font-medium mb-2">与{'{'}{'{'}user{'}'}{'}'}关系 (relationship)</label>
                <input type="text" value={relationship} onChange={e => setRelationship(e.target.value)} placeholder="例如：同学、朋友、恋人、陌生人..." className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 text-gray-800 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-shadow bg-white" />
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
          ) : (
            <div className="flex flex-col gap-6 pt-2">
              <div>
                <label className="block text-[14px] text-gray-700 font-medium mb-2">姓名 (name)</label>
                <input type="text" value={realName} onChange={e => setRealName(e.target.value)} placeholder="例如：李思思" className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 text-gray-800 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-shadow bg-white" />
              </div>
              <div>
                <label className="block text-[14px] text-gray-700 font-medium mb-2">人设描述 (bio)</label>
                <textarea rows={5} value={bio} onChange={e => setBio(e.target.value)} placeholder="简要描述人设的外观、性格和背景..." className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 text-gray-800 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-shadow bg-white resize-none"></textarea>
              </div>
            </div>
          )}
        </div>

        {/* Linked Worldbook */}
        <div className="flex items-center justify-center mb-4 relative">
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
          <span className="bg-[#FAFAFA] px-3 text-gray-500 text-[13px] tracking-widest z-10 font-light">关联世界书</span>
        </div>

        <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-100/60 mb-8 flex flex-col gap-4">
          <p className="text-[12px] text-gray-500 leading-relaxed mx-1">
            世界书用于为AI提供背景信息、系统提示词、规则设定等，让角色扮演更丰富自然
          </p>
          <div>
            <label className="block text-[14px] text-gray-700 font-medium mb-2 mx-1">已关联的项目({linkedWorldbooks.length})</label>
            <div 
              onClick={() => setShowWorldbookSelect(true)}
              className="flex items-center justify-between w-full px-4 py-3.5 rounded-[12px] border border-gray-200 cursor-pointer active:bg-gray-50 bg-white"
            >
              <span className="text-[15px] text-gray-800 line-clamp-1">
                 {linkedWorldbooks.length > 0 ? 
                   allWorldbooks.filter(b => linkedWorldbooks.includes(b.id)).map(b => b.name).join('、 ') 
                   : '点击选择世界书'}
              </span>
              <ChevronRight size={18} className="text-gray-400 shrink-0 ml-2" />
            </div>
          </div>
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

        {/* My Chat Avatar */}
        <div className="flex items-center justify-center mb-4 relative">
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
          <span className="bg-[#FAFAFA] px-3 text-gray-500 text-[13px] tracking-widest z-10 font-light">我的聊天头像</span>
        </div>

        <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-100/60 mb-8 flex flex-col gap-4">
          <div>
            <label className="block text-[14px] text-gray-700 font-medium mb-3">绑定头像 (my_bound_avatar)</label>
            <div className="flex items-center gap-4">
              <div 
                onClick={() => myFileInputRef.current?.click()}
                className="w-[72px] h-[72px] rounded-[18px] bg-[#f8f9fa] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 cursor-pointer overflow-hidden relative"
              >
                {myAvatarPreview ? (
                  <img src={myAvatarPreview} alt="My Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={36} strokeWidth={1.5} className="mb-0.5" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] text-gray-700 font-medium cursor-pointer" onClick={() => myFileInputRef.current?.click()}>点击上传专属头像 (可选)</span>
                <span className="text-[12px] text-gray-400 mt-1 leading-relaxed">为这张人设卡单独设置"我"的聊天头像；不上传则默认。</span>
              </div>
              <input 
                type="file" 
                ref={myFileInputRef} 
                onChange={handleMyAvatarSelect} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          </div>
        </div>

        {/* My Mask Persona */}
        <div className="flex items-center justify-center mb-4 relative">
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
          <span className="bg-[#FAFAFA] px-3 text-gray-500 text-[13px] tracking-widest z-10 font-light">我的面具人设</span>
        </div>

        <div className="bg-[#FFF8EE] rounded-[24px] p-5 border border-[#FFE8CB] mb-6 flex items-center justify-between">
          <div className="flex flex-col pr-4">
             <span className="text-[15px] text-gray-800 font-medium mb-1.5 ml-1">启用面具人设</span>
             <span className="text-[12px] text-gray-500 leading-relaxed ml-1">关闭时使用你的真实人设，开启后TA会认为你是面具人设中的角色</span>
          </div>
          <ToggleSwitch checked={enableMask} onChange={setEnableMask} />
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="absolute bottom-0 w-full bg-white border-t border-gray-100 px-5 pt-3 pb-8 flex gap-4 z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
        <button onClick={onBack} className="flex-1 bg-[#F4F4F5] active:bg-[#E5E5EA] text-gray-700 text-[15px] font-medium py-3.5 rounded-[14px] transition-colors">
          取消
        </button>
        <button 
          onClick={() => {
            onSave({ 
              id: initialData?.id || 'ws_' + Date.now(), 
              name: realName.trim() || wechatName.trim() || '未命名人设', // name represents the real kernel name 
              wechatName: wechatName.trim(), 
              wechatId: wechatId, 
              wechat_id: wechatId, 
              region: region,
              signature,
              gender,
              age,
              birthday,
              identity,
              nickname,
              personality,
              appearance,
              relationship,
              communication_style: communicationStyle,
              lifestyle,
              background,
              nsfw_info: nsfwInfo,
              nsfw: nsfwInfo, 
              bio: bio,
              mode: detailedTemplate ? 'detailed' : 'normal',
              avatar: avatarPreview, 
              my_bound_avatar: myAvatarPreview,
              enableMask,
              relationships,
              linked_worldbooks: linkedWorldbooks
            }, sendRequest);
          }}
          className="flex-1 bg-[#2C2C2E] active:bg-[#1A1A1C] text-white text-[15px] font-medium py-3.5 rounded-[14px] transition-colors shadow-sm"
        >
          保存
        </button>
      </div>

      <AnimatePresence>
        {showWorldbookSelect && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }} transition={{ duration: 0.2 }}
            className="fixed inset-0 items-end justify-center z-[110] max-w-[420px] mx-auto flex"
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowWorldbookSelect(false)} />
            <div className="w-full h-[70vh] bg-white rounded-t-[20px] flex flex-col relative pb-[env(safe-area-inset-bottom)]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                <span className="text-[17px] font-medium text-gray-800">选择要关联的世界书</span>
                <button onClick={() => setShowWorldbookSelect(false)} className="text-gray-400 active:text-gray-600">
                  <X size={24} strokeWidth={1.5} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {allWorldbooks.length === 0 ? (
                  <div className="text-center text-gray-400 py-10 text-[14px]">暂无世界书，请前往世界书应用创建</div>
                ) : allWorldbooks.map((book: any) => {
                  const isSelected = linkedWorldbooks.includes(book.id);
                  return (
                    <div 
                      key={book.id}
                      onClick={() => handleToggleWorldbook(book.id)}
                      className={`w-full flex items-center p-4 rounded-[12px] transition-colors border cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200 bg-white active:bg-gray-50'}`}
                    >
                      <div className="flex-1 flex flex-col">
                        <span className="text-[16px] font-medium text-gray-800">{book.name || '未命名'}</span>
                        <span className="text-[13px] text-gray-500 mt-1">分类：{book.category || '未分类'}</span>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ml-3 ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                        {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNetworkManager && (
          <NetworkManagerScreen 
            onClose={() => setShowNetworkManager(false)}
            relationships={relationships}
            setRelationships={setRelationships}
            personaName={realName || wechatName || '未命名'}
            personas={personas}
            selfId={initialData?.id}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const NetworkManagerScreen = ({ 
  onClose,
  relationships,
  setRelationships,
  personaName,
  personas,
  selfId
}: { 
  onClose: () => void;
  relationships: any[];
  setRelationships: (r: any[]) => void;
  personaName: string;
  personas: any[];
  selfId?: string;
}) => {
  const tabs = ['全部', '家人', '朋友', '同事', '情感', '对手', '其他'];
  const [activeTab, setActiveTab] = useState('全部');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showSelectPersona, setShowSelectPersona] = useState(false);
  
  const [editingRel, setEditingRel] = useState<any | null>(null);

  const filteredRels = activeTab === '全部' ? relationships : relationships.filter(r => r.category === activeTab);

  if (editingRel) {
    return (
      <AddRelationshipScreen 
        initialData={editingRel.data}
        targetPersona={editingRel.target}
        onBack={() => setEditingRel(null)}
        onSave={(data) => {
          setRelationships([...relationships.filter(r => r.targetId !== data.targetId), data]);
          setEditingRel(null);
        }}
      />
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 bg-[#f7f7f7] z-[80] flex flex-col pt-4"
    >
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

      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-white border-b border-gray-100 z-10">
        <button onClick={onClose} className="p-2 -ml-2 text-gray-800 active:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft size={24} strokeWidth={2} />
        </button>
        <span className="text-[17px] font-medium text-gray-800 absolute left-1/2 -translate-x-1/2">
          {personaName}的关系网
        </span>
        <button onClick={() => setShowAddMenu(true)} className="p-2 -mr-2 text-gray-800 active:bg-gray-100 rounded-full transition-colors">
          <Plus size={24} strokeWidth={2} />
        </button>
      </div>

      <div className="flex items-center px-2 py-3 gap-6 overflow-x-auto no-scrollbar bg-white shadow-sm border-b border-gray-50 flex-shrink-0 z-10">
        {tabs.map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[14px] font-medium transition-colors ${
              activeTab === tab 
                ? 'bg-[#f4f5f7] text-[#333]' 
                : 'text-gray-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto w-full flex flex-col">
        {filteredRels.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 -mt-20">
            <span className="text-[16px] text-gray-400 font-medium mb-2">暂无关系</span>
            <span className="text-[13px] text-gray-300">点击右上角 + 添加关系</span>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredRels.map((rel: any, idx) => (
              <div 
                key={idx} 
                className="bg-white p-4 rounded-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between cursor-pointer active:bg-gray-50"
                onClick={() => setEditingRel({ data: rel, target: personas.find(p => p.id === rel.targetId) })}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-[12px] bg-gray-100 flex items-center justify-center overflow-hidden">
                    {personas.find(p => p.id === rel.targetId)?.avatar ? (
                      <img src={personas.find(p => p.id === rel.targetId)?.avatar} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <User className="text-gray-400" size={24} />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[15px] font-medium text-gray-900 mb-0.5">{personas.find(p => p.id === rel.targetId)?.name || '未命名'}</span>
                    <span className="text-[13px] text-gray-500">{rel.title} · {rel.category}</span>
                  </div>
                </div>
                <div className="text-[13px] font-medium text-[#f9823c]">亲密度 {rel.intimacy}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[90]"
              onClick={() => setShowAddMenu(false)}
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white rounded-t-[20px] z-[100] pb-8 pt-2"
            >
              <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4"></div>
              <div className="px-6 pb-2 text-center text-[15px] font-medium text-gray-800">添加关系</div>
              
              <div className="py-2">
                <button 
                  className="w-full text-left px-6 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors flex flex-col"
                  onClick={() => { setShowAddMenu(false); setShowSelectPersona(true); }}
                >
                  <span className="text-[16px] text-gray-900 mb-1">绑定已有人设</span>
                  <span className="text-[13px] text-gray-400">从你的人设库中选择一个角色</span>
                </button>
                <div className="h-[1px] w-[90%] mx-auto bg-gray-100"></div>
                <button 
                  className="w-full text-left px-6 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors flex flex-col"
                  onClick={() => {
                    alert('敬请期待');
                    setShowAddMenu(false);
                  }}
                >
                  <span className="text-[16px] text-gray-900 mb-1">创建纯NPC</span>
                  <span className="text-[13px] text-gray-400">创建一个不需要聊天的背景角色</span>
                </button>
              </div>
              <div className="h-2 w-full bg-[#f4f5f7]"></div>
              <button 
                className="w-full p-4 text-[16px] text-gray-500 font-medium active:bg-gray-50"
                onClick={() => setShowAddMenu(false)}
              >
                取消
              </button>
            </motion.div>
          </>
        )}

        {showSelectPersona && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }} transition={{ duration: 0.2 }}
            className="fixed inset-0 items-end justify-center z-[110] max-w-[420px] mx-auto flex"
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowSelectPersona(false)} />
            <div className="w-full h-[70vh] bg-white rounded-t-[20px] flex flex-col relative">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                <span className="text-[17px] font-medium text-gray-800">选择人设</span>
                <button onClick={() => setShowSelectPersona(false)} className="text-gray-400 active:text-gray-600">
                  <X size={24} strokeWidth={1.5} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {personas.map(p => {
                  const isSelf = p.id === selfId;
                  return (
                    <button 
                      key={p.id}
                      className={`w-full flex items-center p-3 rounded-[12px] transition-colors border ${isSelf ? 'border-transparent opacity-60' : 'border-gray-50 bg-gray-50/50 active:bg-gray-100'}`}
                      disabled={isSelf}
                      onClick={() => {
                        setShowSelectPersona(false);
                        setEditingRel({ data: { targetId: p.id, title: '', category: '其他', intimacy: 5, description: '', isWechatFriend: false }, target: p });
                      }}
                    >
                      <div className="w-[52px] h-[52px] rounded-full bg-gray-200 flex items-center justify-center shrink-0 overflow-hidden mr-4 shadow-inner">
                        {p.avatar ? (
                          <img src={p.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User size={24} className="text-gray-400" />
                        )}
                      </div>
                      <div className="flex flex-col items-start text-left flex-1 min-w-0">
                        <span className="text-[16px] font-medium text-gray-800 truncate w-full">
                          {p.name || '未命名'} {isSelf && <span className="font-normal text-gray-400 text-[14px]"> (不能绑定自己)</span>}
                        </span>
                        <span className="text-[13px] text-gray-400 truncate w-full mt-0.5">
                          {p.wechatId ? `Wechat: ${p.wechatId}` : '未设置微信号'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const AddRelationshipScreen = ({
  initialData,
  targetPersona,
  onBack,
  onSave
}: {
  initialData: any;
  targetPersona: any;
  onBack: () => void;
  onSave: (data: any) => void;
}) => {
  const [title, setTitle] = useState(initialData.title || '');
  const [category, setCategory] = useState(initialData.category || '其他');
  const [intimacy, setIntimacy] = useState(initialData.intimacy || 5);
  const [desc, setDesc] = useState(initialData.description || '');
  const [isWechatFriend, setIsWechatFriend] = useState(initialData.isWechatFriend || false);

  const categories = ['家人', '朋友', '同事', '情感', '对手', '其他'];

  return (
    <motion.div 
      initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 bg-[#f7f7f7] z-[120] flex flex-col pt-4"
    >
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

      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-white border-b border-gray-100 z-10 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-800 active:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft size={24} strokeWidth={2} />
        </button>
        <span className="text-[17px] font-medium text-gray-800 absolute left-1/2 -translate-x-1/2">
          添加关系
        </span>
        <button 
          onClick={() => {
            onSave({
              targetId: targetPersona.id,
              title,
              category,
              intimacy,
              description: desc,
              isWechatFriend
            });
          }} 
          className="text-[15px] font-medium text-gray-800"
        >
          保存
        </button>
      </div>

      <div className="flex-1 overflow-y-auto w-full flex flex-col p-4 gap-6 pb-[100px]">
        <div className="bg-white rounded-[16px] p-5 flex items-center gap-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-100/60">
          <div className="w-[56px] h-[56px] rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            {targetPersona?.avatar ? (
                <img src={targetPersona.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
                <User size={28} className="text-gray-400" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-[16px] font-medium text-gray-900 mb-1">{targetPersona?.name || '未命名'}</span>
            <span className="text-[13px] text-gray-400">关联人设</span>
          </div>
        </div>

        <div className="flex items-center justify-center relative">
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
          <span className="bg-[#f7f7f7] px-3 text-gray-500 text-[13px] tracking-widest z-10 font-light">关系设置</span>
        </div>

        <div className="bg-white rounded-[24px] px-5 py-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-100/60 flex flex-col gap-6">
          <div>
            <label className="block text-[14px] text-gray-700 font-medium mb-3">关系称呼</label>
            <input 
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例如：妈妈、闺蜜、前任..." 
              className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 focus:outline-none focus:border-gray-300" 
            />
          </div>

          <div>
            <label className="block text-[14px] text-gray-700 font-medium mb-3">分类</label>
            <div className="flex flex-wrap gap-3">
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-4 py-1.5 rounded-full text-[14px] transition-colors ${
                    category === c ? 'bg-[#333] text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-[14px] text-gray-700 font-medium">亲密度</label>
              <span className="text-[18px] font-bold text-[#f9823c]">{intimacy}</span>
            </div>
            <input 
              type="range" 
              min="0" max="100" 
              value={intimacy}
              onChange={e => setIntimacy(parseInt(e.target.value))}
              className="w-full accent-[#333] h-1.5 bg-gray-200 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-[14px] text-gray-700 font-medium mb-3">描述</label>
            <input 
              type="text" 
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="简短描述这段关系..." 
              className="w-full text-[15px] px-4 py-3.5 rounded-[12px] border border-gray-200 placeholder:text-gray-400 focus:outline-none focus:border-gray-300" 
            />
          </div>
        </div>

        <div className="flex items-center justify-center relative">
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
          <span className="bg-[#f7f7f7] px-3 text-gray-500 text-[13px] tracking-widest z-10 font-light">微信好友</span>
        </div>

        <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-100/60 flex items-center justify-between">
          <div className="flex flex-col pr-4">
             <span className="text-[15px] text-gray-800 font-medium mb-1.5 ml-1">互加微信好友</span>
             <span className="text-[12px] text-gray-500 leading-relaxed ml-1">开启后表示两人互加了微信，可以看到对方朋友圈</span>
          </div>
          <ToggleSwitch checked={isWechatFriend} onChange={setIsWechatFriend} />
        </div>

        <div className="flex items-center justify-center relative">
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
          <span className="bg-[#f7f7f7] px-3 text-gray-500 text-[13px] tracking-widest z-10 font-light">共同事件</span>
        </div>
        
        <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-100/60 flex flex-col justify-center items-center h-[120px] mb-8">
          <span className="text-[14px] text-gray-400 mb-1">未添加共同事件</span>
          <button className="text-[14px] text-[#576B95] font-medium">+ 添加事件</button>
        </div>
      </div>
    </motion.div>
  );
};
