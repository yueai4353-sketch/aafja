import React, { useState, useEffect } from 'react';
import { ChevronLeft, Settings, Search, Delete, RefreshCw, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatDB } from '../db';

interface Persona {
  id: string;
  name: string;
  avatar: string | null;
  bio?: string;
  [key: string]: any;
}

interface CheckPhoneAppProps {
  onBack: () => void;
  personas: Persona[];
}

// 从 localStorage 读取密码缓存
const getPasswordCache = (): Record<string, { password: string; hint: string }> => {
  try {
    const cached = localStorage.getItem('os_checkphone_passwords');
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
};

// 保存密码缓存到 localStorage
const savePasswordCache = (cache: Record<string, { password: string; hint: string }>) => {
  localStorage.setItem('os_checkphone_passwords', JSON.stringify(cache));
};

export const CheckPhoneApp: React.FC<CheckPhoneAppProps> = ({ onBack, personas }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [passcode, setPasscode] = useState<string>('');
  const [passwordHint, setPasswordHint] = useState<string>('正在生成密码');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [passwordCache, setPasswordCache] = useState<Record<string, { password: string; hint: string }>>(getPasswordCache);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [openedApp, setOpenedApp] = useState<string | null>(null);

  // MissAV 视频数据 - 从缓存读取
  const [missAvVideos, setMissAvVideos] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem(`os_missav_${selectedPersona?.id || ''}`);
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });

  const handleNumberClick = (num: string) => {
    if (passcode.length < 4) {
      const newPasscode = passcode + num;
      setPasscode(newPasscode);
      if (newPasscode.length === 4) {
        if (newPasscode === generatedPassword || newPasscode === '0000') {
          // Unlocked successfully! ('0000' is a backdoor just in case)
          setTimeout(() => setIsUnlocked(true), 300);
        } else {
          // Wrong password, shake and clear (basic effect via clearing for now)
          setTimeout(() => setPasscode(''), 500);
        }
      }
    }
  };

  const handleDelete = () => {
    setPasscode(prev => prev.slice(0, -1));
  };

  const handleBackToLockScreen = () => {
    setIsUnlocked(false);
    setPasscode('');
  };

  const [isMissAvLoading, setIsMissAvLoading] = useState(false);
  const [showMissAvModal, setShowMissAvModal] = useState(false);
  const [missAvUserPrompt, setMissAvUserPrompt] = useState(`1. 符合你的性格特点和性癖好\n2. 反映你的审美偏好和身份背景\n3. 贴合你的情感状态和生活经历\n4. 真实反映你这个人物会看什么类型的内容`);
  const [missAvError, setMissAvError] = useState('');
  const [shareVideo, setShareVideo] = useState<any>(null);
  const [longPressTimer, setLongPressTimer] = useState<any>(null);

  const handleVideoLongPressStart = (video: any) => {
    const timer = setTimeout(() => {
      setShareVideo(video);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleVideoLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleShareConfirm = async () => {
    if (!shareVideo || !selectedPersona) return;
    // 构建分享卡片消息：用特殊前缀 + JSON 数据，便于聊天界面识别并渲染为卡片
    const cardData = JSON.stringify({
      id: shareVideo.id,
      title: shareVideo.title,
      tags: shareVideo.tags || [],
      duration: shareVideo.duration
    });
    const shareText = `[MISSAV_CARD]${cardData}[/MISSAV_CARD]`;
    // 写入 IndexedDB (Dexie ChatDB)
    try {
      await ChatDB.messages.add({
        contactId: selectedPersona.id,
        fullTimestamp: Date.now(),
        text: shareText,
        isMe: true,
        msgType: 'text',
      });
      // 通知 App.tsx 刷新聊天数据
      window.dispatchEvent(new CustomEvent('chat-db-updated'));
      console.log('[MissAV] 分享成功，已写入聊天记录');
    } catch (e) {
      console.error('分享失败:', e);
    }
    setShareVideo(null);
  };

  const handleRefreshClick = () => {
    if (isMissAvLoading) return;
    setMissAvError('');
    setShowMissAvModal(true);
  };

  const handleMissAvConfirm = () => {
    setShowMissAvModal(false);
    refreshMissAvVideos(missAvUserPrompt);
  };

  const refreshMissAvVideos = async (userRequirements?: string) => {
    if (!selectedPersona || isMissAvLoading) return;
    setIsMissAvLoading(true);

    try {
      // 读取用户人设
      const myProfileStr = localStorage.getItem('os_my_profile');
      const myProfile = myProfileStr ? JSON.parse(myProfileStr) : {};
      
      // 读取世界书
      let worldbookContent = '';
      try {
        const savedBooks = localStorage.getItem('os_worldbooks');
        if (savedBooks) {
          let books = JSON.parse(savedBooks);
          
          // 筛选该角色绑定的世界书
          if (selectedPersona.linked_worldbooks && Array.isArray(selectedPersona.linked_worldbooks)) {
            if (selectedPersona.linked_worldbooks.length > 0) {
              books = books.filter((wb: any) => selectedPersona.linked_worldbooks.includes(wb.id));
            } else {
              books = [];
            }
          } else if (selectedPersona.linkedWorldbooks && Array.isArray(selectedPersona.linkedWorldbooks)) {
            if (selectedPersona.linkedWorldbooks.length > 0) {
              books = books.filter((wb: any) => selectedPersona.linkedWorldbooks.includes(wb.id));
            } else {
              books = [];
            }
          }
          
          books.forEach((wb: any) => {
            if (wb.editMode === 'simple') {
              if (wb.content && wb.content.trim()) {
                worldbookContent += `\n[${wb.name}]: ${wb.content}`;
              }
            } else if (wb.entries && wb.entries.length > 0) {
              wb.entries.forEach((entry: any) => {
                if (entry.content && entry.content.trim()) {
                  worldbookContent += `\n[${wb.name}] - ${entry.keys}: ${entry.content}`;
                }
              });
            }
          });
        }
      } catch (e) {
        console.warn('读取世界书失败:', e);
      }
      
      // 构建AI人设信息
      let aiPersonaInfo = '';
      if (selectedPersona.mode === 'detailed') {
        aiPersonaInfo = `真实姓名：${selectedPersona.name}
性别：${selectedPersona.gender || '未知'}
年龄：${selectedPersona.age || '未知'}
生日：${selectedPersona.birthday || '未知'}
身份：${selectedPersona.identity || '未知'}
性格：${selectedPersona.personality || '未知'}
外观：${selectedPersona.appearance || '未知'}
沟通风格：${selectedPersona.communication_style || '未知'}
生活习惯：${selectedPersona.lifestyle || '未知'}
成长经历：${selectedPersona.background || '未知'}
与对方的关系：${selectedPersona.relationship || '未设定'}
${selectedPersona.nsfw_info ? 'NSFW相关：' + selectedPersona.nsfw_info : ''}`;
      } else {
        aiPersonaInfo = `真实姓名：${selectedPersona.name}
人设描述：${selectedPersona.bio || ''}`;
      }
      
      // 构建用户人设信息
      const userPersonaInfo = `真实姓名：${myProfile.real_name || myProfile.name || '未告知'}
性别：${myProfile.gender || '未知'}
年龄：${myProfile.age || '未知'}
生日：${myProfile.birthday || '未知'}
身份：${myProfile.identity || '未知'}
性格：${myProfile.personality || '未知'}
${myProfile.nsfw ? 'NSFW相关：' + myProfile.nsfw : ''}`;
      
      // 构建MissAV生成提示词
      const prompt = `【角色扮演最高指令】你现在正在进行一场沉浸式的角色扮演。请你完全忘掉自己是AI语言模型。你有着独立的思想、生活状态和真实的人性，你就是下面设定的这个角色！

【你的真实内核信息】
${aiPersonaInfo}

【与你交互的用户信息】
${userPersonaInfo}
${worldbookContent ? '\n【相关世界书知识】\n' + worldbookContent : ''}

【任务】
现在我们要模拟你的AV视频浏览记录。请生成6条你会收藏的成人视频。

这些视频应该：
${userRequirements || `1. 符合你的性格特点和性癖好
2. 反映你的审美偏好和身份背景
3. 贴合你的情感状态和生活经历
4. 真实反映你这个人物会看什么类型的内容`}

请严格按照以下JSON格式输出6条视频，不要有任何其他内容：

[
  {
    "id": "随机AV番号（如SSNI-XXX、IPX-XXX、SSIS-XXX、JUL-XXX、MIDV-XXX等，要真实感）",
    "title": "番号 【标题关键词】简短标题（60-80字，直白简短）",
    "tags": ["标签1", "标签2", "标签3", "标签4"],
    "duration": "HH:MM:SS（1-3小时之间的随机时长）"
  },
  {
    "id": "...",
    "title": "...",
    "tags": [...],
    "duration": "..."
  },
  {
    "id": "...",
    "title": "...",
    "tags": [...],
    "duration": "..."
  },
  {
    "id": "...",
    "title": "...",
    "tags": [...],
    "duration": "..."
  },
  {
    "id": "...",
    "title": "...",
    "tags": [...],
    "duration": "..."
  },
  {
    "id": "...",
    "title": "...",
    "tags": [...],
    "duration": "..."
  }
]

注意：
- 标题描述要具体、用词粗暴直白下流、有画面感，参考AV，能让人一眼看出内容特点
- 标签要精准反映视频的核心要素
- 时长格式必须是HH:MM:SS（如01:32:45、02:15:30等）
- 番号要看起来真实合理
- 6条视频要有一定的多样性，但都应该符合角色的整体偏好`;

      // 获取API配置
      let apiUrl = (localStorage.getItem('os_api_url') || '').trim();
      let apiKey = (localStorage.getItem('os_api_key') || '').trim();
      let model = (localStorage.getItem('os_api_model') || '').trim();

      const settingsStr = localStorage.getItem('os_settings');
      if (settingsStr) {
        try {
          const settings = JSON.parse(settingsStr);
          const defaultApiId = settings.defaultApiId;
          if (defaultApiId) {
            const providersStr = localStorage.getItem('os_api_providers');
            if (providersStr) {
              const providers = JSON.parse(providersStr);
              const defaultApi = providers.find((p: any) => p.id === defaultApiId);
              if (defaultApi) {
                apiUrl = defaultApi.apiUrl || apiUrl;
                apiKey = defaultApi.apiKey || apiKey;
                model = defaultApi.model || model;
              }
            }
          }
        } catch (e) {
          console.warn('Failed to parse settings or providers', e);
        }
      }

      if (!apiUrl || !apiKey || !model) {
        console.error('API 未配置');
        setMissAvVideos([]);
        return;
      }

      let completionsUrl = apiUrl;
      if (!completionsUrl.endsWith('/chat/completions')) {
        completionsUrl = completionsUrl.endsWith('/') ? `${completionsUrl}chat/completions` : `${completionsUrl}/chat/completions`;
      }

      const response = await fetch(completionsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.9,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`API 请求失败 (${response.status})`);
      }

      const data = await response.json();
      let resultText = data.choices?.[0]?.message?.content || '';
      
      // 解析JSON - 健壮处理
      resultText = resultText.trim();
      // 去除markdown代码块标记
      resultText = resultText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/,'').trim();
      
      // 提取JSON数组部分
      const jsonStart = resultText.indexOf('[');
      const jsonEnd = resultText.lastIndexOf(']');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        resultText = resultText.substring(jsonStart, jsonEnd + 1);
      }
      
      // 移除字符串值中的换行符（将实际换行替换为空格）
      resultText = resultText.replace(/\n/g, ' ').replace(/\r/g, '');
      // 清理多余空格
      resultText = resultText.replace(/\s+/g, ' ');
      
      console.log('[MissAV] 解析JSON:', resultText.substring(0, 200));
      const videos = JSON.parse(resultText);
      const videoList = Array.isArray(videos) ? videos : [];
      setMissAvVideos(videoList);
      // 缓存到 localStorage
      if (selectedPersona && videoList.length > 0) {
        localStorage.setItem(`os_missav_${selectedPersona.id}`, JSON.stringify(videoList));
      }
      
    } catch (error: any) {
      console.error('MissAV 刷新失败:', error);
      setMissAvVideos([]);
    } finally {
      setIsMissAvLoading(false);
    }
  };

  const generatePasswordWithAI = async (persona: Persona) => {
    setIsGenerating(true);
    setPasswordHint('正在生成密码...');
    setPasscode('');
    
    try {
      // 读取用户人设
      const myProfileStr = localStorage.getItem('os_my_profile');
      const myProfile = myProfileStr ? JSON.parse(myProfileStr) : {};
      
      // 读取世界书
      let worldbookContent = '';
      try {
        const savedBooks = localStorage.getItem('os_worldbooks');
        if (savedBooks) {
          let books = JSON.parse(savedBooks);
          
          if (persona.linked_worldbooks && Array.isArray(persona.linked_worldbooks)) {
            if (persona.linked_worldbooks.length > 0) {
              books = books.filter((wb: any) => persona.linked_worldbooks.includes(wb.id));
            } else {
              books = [];
            }
          } else if (persona.linkedWorldbooks && Array.isArray(persona.linkedWorldbooks)) {
            if (persona.linkedWorldbooks.length > 0) {
              books = books.filter((wb: any) => persona.linkedWorldbooks.includes(wb.id));
            } else {
              books = [];
            }
          }
          
          books.forEach((wb: any) => {
            if (wb.editMode === 'simple') {
              if (wb.content && wb.content.trim()) {
                worldbookContent += `\n[${wb.name}]: ${wb.content}`;
              }
            } else if (wb.entries && wb.entries.length > 0) {
              wb.entries.forEach((entry: any) => {
                if (entry.content && entry.content.trim()) {
                  worldbookContent += `\n[${wb.name}] - ${entry.keys}: ${entry.content}`;
                }
              });
            }
          });
        }
      } catch (e) {
        console.warn('读取世界书失败:', e);
      }
      
      // 构建AI人设信息
      let aiPersonaInfo = '';
      if (persona.mode === 'detailed') {
        aiPersonaInfo = `真实姓名：${persona.name}
性别：${persona.gender || '未知'}
年龄：${persona.age || '未知'}
生日：${persona.birthday || '未知'}
身份：${persona.identity || '未知'}
性格：${persona.personality || '未知'}
外观：${persona.appearance || '未知'}
沟通风格：${persona.communication_style || '未知'}
生活习惯：${persona.lifestyle || '未知'}
成长经历：${persona.background || '未知'}
与对方的关系：${persona.relationship || '未设定'}`;
      } else {
        aiPersonaInfo = `真实姓名：${persona.name}
人设描述：${persona.bio || ''}`;
      }
      
      // 构建用户人设信息
      const userPersonaInfo = `真实姓名：${myProfile.real_name || myProfile.name || '未告知'}
性别：${myProfile.gender || '未知'}
年龄：${myProfile.age || '未知'}
生日：${myProfile.birthday || '未知'}
身份：${myProfile.identity || '未知'}
性格：${myProfile.personality || '未知'}`;
      
      // 构建密码生成提示词
      const prompt = `【角色扮演最高指令】你现在正在进行一场沉浸式的角色扮演。请你完全忘掉自己是AI语言模型。你有着独立的思想、生活状态和真实的人性，你就是下面设定的这个角色！请认准"你的真实内核信息"，并和对面的"人类用户"进行交互，绝不可以把人类用户的人设当成你自己。

【你的真实内核信息】
${aiPersonaInfo}

【与你交互的用户信息】
${userPersonaInfo}
${worldbookContent ? '\n【相关世界书知识】\n' + worldbookContent : ''}

【任务】
现在用户想要解锁你的手机。请你基于自己的人设、与用户的关系、以及你们之间的故事，生成一个4位数字的密码，并给出一句提示语来暗示这个密码。

要求：
1. 密码必须是4位数字（0000-9999）
2. 密码应该与你的人设（如生日、纪念日、有意义的数字等）有关联
3. 提示语要符合你的性格和说话方式，既要给出线索让用户猜到，又不能太直白
4. 提示语要简短，一句话即可（20字以内）

请严格按照以下JSON格式输出，不要有任何其他内容：
{"password": "四位数字密码", "hint": "一句提示语"}`;

      let apiUrl = (localStorage.getItem('os_api_url') || '').trim();
      let apiKey = (localStorage.getItem('os_api_key') || '').trim();
      let model = (localStorage.getItem('os_api_model') || '').trim();

      const settingsStr = localStorage.getItem('os_settings');
      if (settingsStr) {
        try {
          const settings = JSON.parse(settingsStr);
          const defaultApiId = settings.defaultApiId;
          if (defaultApiId) {
            const providersStr = localStorage.getItem('os_api_providers');
            if (providersStr) {
              const providers = JSON.parse(providersStr);
              const defaultApi = providers.find((p: any) => p.id === defaultApiId);
              if (defaultApi) {
                apiUrl = defaultApi.apiUrl || apiUrl;
                apiKey = defaultApi.apiKey || apiKey;
                model = defaultApi.model || model;
              }
            }
          }
        } catch (e) {
          console.warn('Failed to parse settings or providers', e);
        }
      }

      if (!apiUrl || !apiKey || !model) {
        setPasswordHint('请先在设置中配置 API');
        setIsGenerating(false);
        return;
      }

      let completionsUrl = apiUrl;
      if (!completionsUrl.endsWith('/chat/completions')) {
        completionsUrl = completionsUrl.endsWith('/') ? `${completionsUrl}chat/completions` : `${completionsUrl}/chat/completions`;
      }

      const response = await fetch(completionsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`API 请求失败 (${response.status})`);
      }

      const data = await response.json();
      let resultText = data.choices?.[0]?.message?.content || '';
      
      // 解析JSON
      resultText = resultText.trim();
      if (resultText.startsWith('```json')) {
        resultText = resultText.substring(7);
      } else if (resultText.startsWith('```')) {
        resultText = resultText.substring(3);
      }
      if (resultText.endsWith('```')) {
        resultText = resultText.substring(0, resultText.length - 3);
      }
      resultText = resultText.trim();
      
      const parsed = JSON.parse(resultText);
      const password = parsed.password || '0000';
      const hint = parsed.hint || '猜猜看~';
      
      setGeneratedPassword(password);
      setPasswordHint(hint);
      
      // 缓存密码到 localStorage
      const newCache = { ...passwordCache, [persona.id]: { password, hint } };
      setPasswordCache(newCache);
      savePasswordCache(newCache);
      
    } catch (error: any) {
      console.error('密码生成失败:', error);
      setPasswordHint('生成失败，点击刷新重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // 当打开 MissAV 时，如果列表为空则自动加载
  useEffect(() => {
    if (openedApp === 'missav' && missAvVideos.length === 0 && !isMissAvLoading) {
      refreshMissAvVideos();
    }
  }, [openedApp]);

  // 选中人物时检查缓存，有缓存直接用，没有才生成
  useEffect(() => {
    if (selectedPersona) {
      const cached = passwordCache[selectedPersona.id];
      if (cached) {
        // 使用缓存的密码和提示语
        setGeneratedPassword(cached.password);
        setPasswordHint(cached.hint);
        setPasscode('');
      } else {
        // 没有缓存，调用AI生成
        generatePasswordWithAI(selectedPersona);
      }
      // 加载该人物的 MissAV 缓存
      try {
        const missAvCached = localStorage.getItem(`os_missav_${selectedPersona.id}`);
        setMissAvVideos(missAvCached ? JSON.parse(missAvCached) : []);
      } catch {
        setMissAvVideos([]);
      }
    }
  }, [selectedPersona]);

  const filteredPersonas = personas.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.nickname && p.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute inset-0 z-50 bg-[#f4f5f7] flex flex-col"
    >
      {/* 顶部导航栏 */}
      <div className="flex-shrink-0 bg-white shadow-sm z-10 pt-[env(safe-area-inset-top,0px)]">
        <div className="h-14 flex items-center justify-between px-4">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <ChevronLeft size={24} className="text-gray-700" />
          </button>
          
          <h1 className="text-[17px] font-medium text-gray-900 tracking-wide">查手机</h1>
          
          <button 
            onClick={() => {/* TODO: 处理设置点击 */}}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <Settings size={22} className="text-gray-700" />
          </button>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="搜索人员..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-100 border-none rounded-xl py-2 pl-9 pr-4 text-[14px] focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none"
          />
        </div>
      </div>

      {/* 人员列表 */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain pb-6">
        <div className="bg-white mt-3 border-y border-gray-100">
          {filteredPersonas.length > 0 ? (
            filteredPersonas.map((persona, index) => (
              <div 
                key={persona.id}
                className={`flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors ${index !== filteredPersonas.length - 1 ? 'border-b border-gray-100/50' : ''}`}
                onClick={() => { setSelectedPersona(persona); setPasscode(''); }}
              >
                <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center mr-3 shadow-sm border border-gray-100">
                  {persona.avatar ? (
                    <img src={persona.avatar} alt={persona.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-500 font-medium text-lg">{persona.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h3 className="text-[16px] font-medium text-gray-900 truncate">{persona.name}</h3>
                  </div>
                  <p className="text-[13px] text-gray-500 truncate">{persona.identity || persona.bio || '暂无简介'}</p>
                </div>
                <ChevronLeft size={16} className="text-gray-300 transform rotate-180 flex-shrink-0 ml-2" />
              </div>
            ))
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400">
              <Search size={32} className="mb-3 opacity-20" />
              <p className="text-[14px]">没有找到匹配的人员</p>
            </div>
          )}
        </div>
      </div>

      {/* 解锁手机遮罩层 */}
      <AnimatePresence>
        {selectedPersona && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-[60] bg-[#fafafa] flex flex-col"
          >
            {/* 解锁页顶部导航 */}
            <div className="flex-shrink-0 bg-transparent pt-[env(safe-area-inset-top,0px)]">
              <div className="h-14 flex items-center justify-between px-4 relative">
                <button 
                  onClick={() => setSelectedPersona(null)}
                  className="p-2 -ml-2 rounded-full hover:bg-gray-200/50 active:bg-gray-300/50 transition-colors z-10"
                >
                  <ChevronLeft size={24} className="text-gray-900" />
                </button>
                <h1 className="absolute inset-0 flex items-center justify-center text-[16px] font-medium text-gray-900 tracking-wider">
                  解锁手机
                </h1>
                <button 
                  onClick={() => selectedPersona && generatePasswordWithAI(selectedPersona)}
                  disabled={isGenerating}
                  className="p-2 -mr-2 rounded-full hover:bg-gray-200/50 active:bg-gray-300/50 transition-colors z-10 disabled:opacity-50"
                >
                  <RefreshCw size={20} className={`text-gray-900 ${isGenerating ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center pt-8 sm:pt-16 pb-12">
              {/* 头像区域 */}
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col items-center mb-8"
              >
                <div className="w-[100px] h-[100px] rounded-full overflow-hidden border-[3px] border-white shadow-md bg-gray-200 mb-4">
                  {selectedPersona.avatar ? (
                    <img src={selectedPersona.avatar} alt={selectedPersona.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-gray-400 text-3xl font-medium">
                      {selectedPersona.name.charAt(0)}
                    </span>
                  )}
                </div>
                <h2 className="text-[20px] font-medium text-gray-900">{selectedPersona.name}</h2>
                <p className="text-[12px] text-gray-400 mt-2 tracking-wide font-light">{passwordHint}</p>
              </motion.div>

              {/* 密码指示器 */}
              <div className="flex justify-center gap-5 mb-16">
                {[0, 1, 2, 3].map(i => {
                  const isError = passcode.length === 4 && passcode !== generatedPassword && passcode !== '0000';
                  return (
                    <div 
                      key={i} 
                      className={`w-3.5 h-3.5 rounded-full border-[1.5px] transition-all duration-200 ${
                        i < passcode.length 
                          ? isError ? 'border-red-500 bg-red-500 scale-110' : 'border-gray-800 bg-gray-800 scale-110' 
                          : 'border-gray-300 bg-transparent'
                      }`}
                    />
                  );
                })}
              </div>

              {/* 拨号键盘 */}
              <div className="grid grid-cols-3 gap-x-6 gap-y-4 sm:gap-x-8 sm:gap-y-6 mt-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    onClick={() => handleNumberClick(num.toString())}
                    className="w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-[28px] sm:text-[32px] font-medium text-gray-800 hover:bg-gray-50 active:bg-gray-200 transition-colors active:scale-95"
                  >
                    {num}
                  </button>
                ))}
                
                <div className="w-[72px] h-[72px] sm:w-[80px] sm:h-[80px]" /> {/* 空白占位 */}
                
                <button
                  onClick={() => handleNumberClick('0')}
                  className="w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-[28px] sm:text-[32px] font-medium text-gray-800 hover:bg-gray-50 active:bg-gray-200 transition-colors active:scale-95"
                >
                  0
                </button>
                
                <button
                  onClick={handleDelete}
                  className="w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] flex items-center justify-center text-gray-500 hover:text-gray-800 active:bg-gray-200/50 rounded-full transition-colors active:scale-95"
                >
                  <Delete size={28} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 解锁后的主屏幕 */}
      <AnimatePresence>
        {isUnlocked && selectedPersona && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-[70] bg-white flex flex-col"
          >
            {/* 顶部状态栏 */}
            <div className="flex-shrink-0 bg-white/80 backdrop-blur-md pt-[env(safe-area-inset-top,0px)] border-b border-gray-100 z-10">
              <div className="h-14 flex items-center justify-between px-4 relative">
                <button 
                  onClick={handleBackToLockScreen}
                  className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors z-10"
                >
                  <ChevronLeft size={24} className="text-gray-800" />
                </button>
                <h1 className="absolute inset-0 flex items-center justify-center text-[16px] font-medium text-gray-900 pointer-events-none">
                  {selectedPersona.name}的手机
                </h1>
                <button 
                  className="p-2 -mr-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors z-10"
                  onClick={() => {/* TODO: Implement settings logic */}}
                >
                  <Settings size={22} className="text-gray-800" />
                </button>
              </div>
            </div>

            {/* 手机桌面内容 */}
            <div className="flex-1 bg-white relative px-4 pt-6 pb-2 overflow-y-auto">
              {/* App 网格 */}
              <div className="grid grid-cols-4 gap-y-6 gap-x-4 max-w-sm mx-auto">
                {/* 微信 */}
                <button className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className="w-14 h-14 rounded-2xl bg-[#07C160] text-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                    <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor">
                      <path d="M8.5,13.5c-0.6,0-1-0.4-1-1s0.4-1,1-1s1,0.4,1,1S9.1,13.5,8.5,13.5z M12.5,13.5c-0.6,0-1-0.4-1-1s0.4-1,1-1s1,0.4,1,1S13.1,13.5,12.5,13.5z M10.5,17c-4.1,0-7.5-2.8-7.5-6.3c0-3.5,3.4-6.3,7.5-6.3c4.1,0,7.5,2.8,7.5,6.3c0,1.9-1,3.6-2.6,4.8l0.7,2.2l-2.4-1.2C12.7,16.8,11.6,17,10.5,17z M18.5,18.5c0.5-0.8,0.8-1.7,0.8-2.6c0-3-2.9-5.4-6.4-5.4c-0.2,0-0.3,0-0.5,0c0.6,0.9,0.9,1.9,0.9,3c0,3.9-3.7,7-8.3,7c-0.2,0-0.4,0-0.6,0c1.2,1.3,3.1,2.1,5.2,2.1c1,0,1.9-0.2,2.7-0.5l2,1l-0.6-1.8C15.6,20.3,18.5,18.5,18.5,18.5z M13.5,16.5c-0.4,0-0.8-0.3-0.8-0.8s0.3-0.8,0.8-0.8s0.8,0.3,0.8,0.8S13.9,16.5,13.5,16.5z M16.5,16.5c-0.4,0-0.8-0.3-0.8-0.8s0.3-0.8,0.8-0.8s0.8,0.3,0.8,0.8S16.9,16.5,16.5,16.5z"/>
                    </svg>
                  </div>
                  <span className="text-[11px] text-gray-800 font-medium">微信</span>
                </button>

                {/* 备忘录 */}
                <button className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FFE7A0] to-[#FFD54F] text-gray-800 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-0 w-full h-3 bg-white/40 backdrop-blur-sm border-b border-gray-800/10"></div>
                    <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="1.5" fill="none" className="mt-2 text-yellow-800 opacity-80">
                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                  </div>
                  <span className="text-[11px] text-gray-800 font-medium">备忘录</span>
                </button>

                {/* 支付宝 */}
                <button className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className="w-14 h-14 rounded-2xl bg-[#1677FF] text-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow font-bold text-2xl font-serif">
                    支
                  </div>
                  <span className="text-[11px] text-gray-800 font-medium">支付宝</span>
                </button>

                {/* 浏览器 */}
                <button className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className="w-14 h-14 rounded-2xl bg-[#007AFF] text-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-[#1E90FF] to-[#0055FF] flex items-center justify-center">
                      <svg viewBox="0 0 24 24" width="30" height="30" stroke="currentColor" strokeWidth="1.5" fill="none">
                        <circle cx="12" cy="12" r="10" fill="white" className="opacity-10"/>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                        <path d="M2 12h20"/>
                      </svg>
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-800 font-medium">浏览器</span>
                </button>

                {/* 健康 */}
                <button className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="#FF2D55">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </div>
                  <span className="text-[11px] text-gray-800 font-medium">健康</span>
                </button>

                {/* 娱乐 */}
                <button className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF2A5F] to-[#FF5E89] text-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow relative overflow-hidden">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                  <span className="text-[11px] text-gray-800 font-medium">娱乐</span>
                </button>

                {/* 设置 */}
                <button className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className="w-14 h-14 rounded-2xl bg-[#8E8E93] text-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                    <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                  </div>
                  <span className="text-[11px] text-gray-800 font-medium">设置</span>
                </button>

                {/* MissAV */}
                <button 
                  onClick={() => setOpenedApp('missav')}
                  className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#000000] text-[#FF9900] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                    <span className="font-bold text-[18px] tracking-tight">MAV</span>
                  </div>
                  <span className="text-[11px] text-gray-800 font-medium">MissAV</span>
                </button>
              </div>
            </div>

            {/* 底部 Dock 栏 */}
            <div className="pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-4 px-6 bg-white/90 backdrop-blur-xl border-t border-gray-100">
              <div className="flex justify-around items-center max-w-sm mx-auto">
                {/* 电话 */}
                <button className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className="w-14 h-14 rounded-2xl bg-[#34C759] text-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                    <svg viewBox="0 0 24 24" width="30" height="30" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <span className="text-[11px] text-gray-600 font-medium">电话</span>
                </button>
                
                {/* 短信 */}
                <button className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className="w-14 h-14 rounded-2xl bg-[#5AC8FA] text-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                    <svg viewBox="0 0 24 24" width="30" height="30" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <span className="text-[11px] text-gray-600 font-medium">信息</span>
                </button>

                {/* 相册 */}
                <button className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF9500] via-[#FFCC00] to-[#FF3B30] text-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      {/* 简易仿 iOS 相册图标的彩色花瓣效果 */}
                      <div className="w-4 h-6 bg-white/30 rounded-full rotate-0 absolute mix-blend-overlay"></div>
                      <div className="w-4 h-6 bg-white/30 rounded-full rotate-45 absolute mix-blend-overlay"></div>
                      <div className="w-4 h-6 bg-white/30 rounded-full rotate-90 absolute mix-blend-overlay"></div>
                      <div className="w-4 h-6 bg-white/30 rounded-full rotate-135 absolute mix-blend-overlay"></div>
                      <div className="w-3 h-3 bg-white rounded-full relative z-10"></div>
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-600 font-medium">照片</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* App内部页面 */}
      <AnimatePresence>
        {isUnlocked && openedApp === 'missav' && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-[80] bg-[#1a1a1a] flex flex-col font-sans"
          >
            {/* MissAV 顶部导航 */}
            <div className="flex-shrink-0 bg-[#1a1a1a] pt-[env(safe-area-inset-top,0px)] border-b border-[#333]">
              <div className="h-14 flex items-center justify-between px-4 relative">
                <button 
                  onClick={() => setOpenedApp(null)}
                  className="p-2 -ml-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors z-10"
                >
                  <ChevronLeft size={28} strokeWidth={3} className="text-white" />
                </button>
                <h1 className="absolute inset-0 flex items-center justify-center text-[20px] font-bold text-white tracking-wider">
                  MissAV
                </h1>
                <div className="flex items-center gap-1 z-10">
                  <button 
                    onClick={() => setMissAvVideos([])}
                    className="p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
                  >
                    <Trash2 size={22} className="text-white" />
                  </button>
                  <button 
                    onClick={handleRefreshClick}
                    disabled={isMissAvLoading}
                    className="p-2 -mr-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={24} className={`text-white ${isMissAvLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* MissAV 内容区 */}
            <div className="flex-1 overflow-y-auto p-4">
              {missAvVideos.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[#888] space-y-3">
                  {isMissAvLoading ? (
                    <>
                      <RefreshCw size={28} className="animate-spin text-[#666]" />
                      <span className="text-[14px]">正在生成推荐视频...</span>
                    </>
                  ) : (
                    <span className="text-[14px]">—请先生成—</span>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {missAvVideos.map((video, idx) => (
                    <div 
                      key={idx} 
                      className="bg-[#2b2b2b] rounded-md overflow-hidden flex flex-col shadow-md select-none"
                      onTouchStart={() => handleVideoLongPressStart(video)}
                      onTouchEnd={handleVideoLongPressEnd}
                      onTouchCancel={handleVideoLongPressEnd}
                      onMouseDown={() => handleVideoLongPressStart(video)}
                      onMouseUp={handleVideoLongPressEnd}
                      onMouseLeave={handleVideoLongPressEnd}
                    >
                      {/* 视频封面占位 */}
                      <div className="relative aspect-[16/10] bg-[#404040] flex items-center justify-center">
                        <div className="absolute top-1.5 left-1.5 bg-[#f24e4d] text-white text-[10px] px-1.5 py-0.5 rounded-sm font-medium tracking-wider">
                          无码
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center">
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="white" className="ml-0.5 opacity-90">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                        <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono tracking-wider">
                          {video.duration}
                        </div>
                      </div>
                      {/* 视频信息 */}
                      <div className="p-2.5 flex flex-col">
                        <h3 className="text-[#f5f5f5] text-[12px] leading-[1.5] mb-2 font-normal break-words whitespace-pre-wrap">
                          {video.title}
                        </h3>
                        <div className="flex flex-wrap gap-x-2 gap-y-1">
                          {video.tags.map((tag, tagIdx) => (
                            <span key={tagIdx} className="text-[#999] text-[11px]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MissAV 分享弹窗 */}
      <AnimatePresence>
        {shareVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/60 flex items-center justify-center px-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#2c2c2e] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="p-5 text-center">
                <p className="text-white text-[15px] leading-relaxed">
                  是否分享给 <span className="font-bold text-[#0a84ff]">{selectedPersona?.name}</span> ？
                </p>
              </div>
              <div className="flex border-t border-[#444]">
                <button
                  onClick={() => setShareVideo(null)}
                  className="flex-1 py-3.5 text-[#0a84ff] text-[15px] font-medium hover:bg-white/5 active:bg-white/10 transition-colors"
                >
                  取消
                </button>
                <div className="w-px bg-[#444]" />
                <button
                  onClick={handleShareConfirm}
                  className="flex-1 py-3.5 text-[#0a84ff] text-[15px] font-bold hover:bg-white/5 active:bg-white/10 transition-colors"
                >
                  确定
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MissAV 刷新弹窗 */}
      <AnimatePresence>
        {showMissAvModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/60 flex items-center justify-center px-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#2c2c2e] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="p-5">
                <h3 className="text-white text-[16px] font-semibold text-center mb-1">生成要求</h3>
                <p className="text-[#999] text-[12px] text-center mb-4">自定义生成视频的偏好方向</p>
                <textarea
                  value={missAvUserPrompt}
                  onChange={(e) => setMissAvUserPrompt(e.target.value)}
                  className="w-full bg-[#1c1c1e] text-white text-[13px] leading-[1.8] rounded-xl p-3 border border-[#444] focus:border-[#0a84ff] outline-none resize-none"
                  rows={5}
                  placeholder="输入生成要求..."
                />
                {missAvError && (
                  <p className="text-red-400 text-[12px] mt-2">{missAvError}</p>
                )}
              </div>
              <div className="flex border-t border-[#444]">
                <button
                  onClick={() => setShowMissAvModal(false)}
                  className="flex-1 py-3.5 text-[#0a84ff] text-[15px] font-medium hover:bg-white/5 active:bg-white/10 transition-colors"
                >
                  取消
                </button>
                <div className="w-px bg-[#444]" />
                <button
                  onClick={handleMissAvConfirm}
                  className="flex-1 py-3.5 text-[#0a84ff] text-[15px] font-bold hover:bg-white/5 active:bg-white/10 transition-colors"
                >
                  确定
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
