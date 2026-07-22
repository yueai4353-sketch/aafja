import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatDB, AppDB } from './db';
import { MyProfileApp } from './apps/MyProfileApp';
import { SettingsApp } from './apps/SettingsApp';
import { WechatApp as WechatScreen } from './apps/WechatApp';
import { HuajiApp as HuajiScreen } from './apps/HuajiApp';
import { CreatePersonaApp as CreatePersonaScreen } from './apps/CreatePersonaApp';
import { WorldbookApp as WorldbookScreen } from './apps/WorldbookApp';
import { ThemeApp as ThemeScreen } from './apps/ThemeApp';
import { buildFullAIContext, buildPhoneCallPrompt } from './utils/aiContext';
import { getWoKongSystemPrompt, tickProp, buildEntryNarration, getActiveRecord } from './utils/woKongManager';
import './utils/xiaohongshuShare';
import { loadMySchedule, loadOtherSchedule, loadPersonaSnapshot, scheduleItemsToText } from './db/youandme';
import { BackgroundLines, IconWechat, IconCalendar, IconWeather, IconHuaji, IconWorldbook, IconDevice, IconCompanion, IconSettings, IconTheme, AppIcon, CurrentTime, SortableAppIcon, IconAccounting, IconSecret, IconMessage, IconPeriod, IconCangxu, IconMemories, IconYouAndMe, IconFeatureIntro, ProfileCard } from './components';
import { WeatherApp as WeatherScreen } from './apps/WeatherApp';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  Camera,
  User,
  MapPin,
  Crosshair,
  PanelTop,
  Focus,
  Columns,
  Smartphone,
  Target,
  Disc,
  Snowflake,
  Signal,
  Wifi,
  Battery,
  Moon,
  ChevronLeft,
  Plus,
  Globe,
  RefreshCcw,
  Users,
  Layout,
  Tag,
  Edit2,
  ChevronRight,
  CreditCard,
  UserPlus,
  Search,
  MoreHorizontal,
  MoreVertical,
  MessageSquare,
  Phone,
  PlusCircle,
  Heart,
  Send,
  X
} from 'lucide-react';

// 一次性清理所有桌面存储中的忆册(jice)图标
(function cleanJice() {
  ['os_desktop_apps_v3', 'os_desktop_apps_p2_v3', 'os_desktop_apps', 'os_desktop_apps_p2'].forEach(key => {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        const filtered = arr.filter((a: any) => a.iconKey !== 'jice');
        if (filtered.length !== arr.length) {
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      } catch (e) {}
    }
  });
})();

import { MemoryApp as MemoryScreen } from './apps/MemoryApp';
import { YouAndMeApp as YouAndMeScreen } from './apps/YouAndMeApp';
import { CangxuApp as CangxuScreen } from './apps/CangxuApp';
import { CheckPhoneApp as CheckPhoneScreen } from './apps/CheckPhoneApp';
import { FeatureIntroApp as FeatureIntroScreen } from './apps/FeatureIntroApp';
import { AboutModal } from './components/AboutModal';

// 每次更新时修改此版本号，会触发弹窗重新显示
const APP_VERSION = '1.0.0';

const CalendarWidget = () => {
  const [view, setView] = useState<'minimal' | 'full'>('minimal');
  const [startY, setStartY] = useState<number | null>(null);
  const [bgImage, setBgImage] = useState<string | null>(() => localStorage.getItem('os_calendar_bg'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragStart = (y: number) => {
    setStartY(y);
  };

  const handleDragEnd = (y: number, isClick: boolean = false) => {
    if (startY === null) return;
    const diff = startY - y;
    if (diff > 30 && view === 'minimal') {
      setView('full');
    } else if (diff < -30 && view === 'full') {
      setView('minimal');
    } else if (isClick && Math.abs(diff) < 5) {
      fileInputRef.current?.click();
    }
    setStartY(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setBgImage(result);
        localStorage.setItem('os_calendar_bg', result);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const date = new Date();
  const today = date.getDate();
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div 
      className="w-full h-full min-h-[140px] bg-white/10 backdrop-blur-lg rounded-[32px] sm:rounded-[40px] shadow-[0_8px_32px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.3),inset_0_0_20px_rgba(255,255,255,0.05)] border border-white/20 backdrop-saturate-150 flex flex-col items-center justify-center transition-transform duration-300 group-hover:scale-[1.02] overflow-hidden relative cursor-ns-resize"
      onTouchStart={(e) => { e.stopPropagation(); handleDragStart(e.touches[0].clientY); }}
      onTouchEnd={(e) => { e.stopPropagation(); handleDragEnd(e.changedTouches[0].clientY, true); }}
      onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e.clientY); }}
      onMouseUp={(e) => { e.stopPropagation(); handleDragEnd(e.clientY, true); }}
      onMouseLeave={(e) => { startY !== null && handleDragEnd(e.clientY, false); }}
    >
      {bgImage && <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-overlay" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>}
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
      
      {/* Daisy Top Left */}
      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 text-white/70 w-6 h-6 sm:w-8 sm:h-8 pointer-events-none drop-shadow-sm flex items-center justify-center z-10">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M12 7c-1-3-3-5-5-5-2 0-4 1-4 3 0 4 5 7 9 7m0 0c1-3 3-5 5-5 2 0 4 1 4 3 0 4-5 7-9 7m0 0c1 3 3 5 5 5 2 0 4-1 4-3 0-4-5-7-9-7m0 0c-1 3-3 5-5 5-2 0-4-1-4-3 0-4 5-7 9-7" fill="currentColor" fillOpacity="0.2" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
      </div>

      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${view === 'minimal' ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}>
        <div className="text-[12px] sm:text-[14px] font-semibold tracking-widest text-[#e87a90] mb-1 sm:mb-2 font-serif mt-1">
          {date.toLocaleDateString('zh-CN', { month: 'long' })}
        </div>
        <div className="text-[52px] sm:text-[64px] leading-none font-medium tracking-tighter text-gray-800 drop-shadow-sm font-sans mb-1">
          {today}
        </div>
        <div className="text-[10px] sm:text-[12px] text-gray-500 font-semibold tracking-wide">
          {date.toLocaleDateString('zh-CN', { weekday: 'long' })}
        </div>
        <div className="absolute bottom-3 w-6 h-1 rounded-full bg-gray-400/30"></div>
      </div>

      <div className={`absolute inset-0 flex flex-col p-4 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${view === 'full' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
        <div className="text-[#e87a90] font-extrabold tracking-wider text-[11px] sm:text-[13px] text-center mb-2 font-serif mt-1">{date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}</div>
        <div className="grid grid-cols-7 gap-y-1 sm:gap-y-1.5 gap-x-0 w-full mb-1">
          {dayNames.map((d, i) => (
            <div key={`dayname-${i}`} className="text-gray-400 font-semibold text-[8px] sm:text-[9px] text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1 sm:gap-y-1.5 gap-x-0 w-full flex-1">
          {days.map((d, i) => (
            <div key={`day-${i}`} className={`flex items-center justify-center text-[10px] sm:text-[11px] font-semibold h-[18px] sm:h-[22px] mx-0.5 sm:mx-1 ${d === today ? 'bg-[#e87a90] text-white shadow-sm shadow-[#e87a90]/40 rounded-full' : 'text-gray-700'}`}>
              {d || ''}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showAboutOnLoad, setShowAboutOnLoad] = useState(false);

  useEffect(() => {
    // 检测是否在 iOS Safari 中且不是 standalone 模式
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in window.navigator && (window.navigator as any).standalone);
    
    if (isIos && !isStandalone) {
      setShowInstallPrompt(true);
    }
  }, []);

  // 首次打开或版本更新时自动弹出关于弹窗
  useEffect(() => {
    const seenVersion = localStorage.getItem('os_about_seen_version');
    if (seenVersion !== APP_VERSION) {
      setShowAboutOnLoad(true);
    }
  }, []);

  const handleCloseAboutOnLoad = () => {
    setShowAboutOnLoad(false);
    localStorage.setItem('os_about_seen_version', APP_VERSION);
  };

  const [currentScreen, setCurrentScreen] = useState<'home' | 'settings' | 'wechat' | 'huaji' | 'create_persona' | 'my_profile' | 'worldbook' | 'theme' | 'memory' | 'youandme' | 'weather' | 'cangxu' | 'check_phone' | 'feature_intro'>('home');
  const [myProfile, setMyProfile] = useState<any>(() => {
    const defaultProfile = {};
    const saved = localStorage.getItem('os_my_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return defaultProfile;
  });
  const [wechatRequests, setWechatRequests] = useState<any[]>(() => {
    const saved = localStorage.getItem('os_wechat_reqs');
    if (saved) { try { return JSON.parse(saved); } catch (e) {} }
    return [];
  });
  const [wechatFriends, setWechatFriends] = useState<any[]>(() => {
    const saved = localStorage.getItem('os_wechat_friends');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });
  const [wechatChats, setWechatChats] = useState<Record<string, any[]>>({});
  const [aiTypingStatus, setAiTypingStatus] = useState<Record<string, boolean>>({});
  const [personas, setPersonas] = useState<any[]>(() => {
    const saved = localStorage.getItem('os_personas');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });
  const [editingPersona, setEditingPersona] = useState<any | null>(null);
  const [globalToast, setGlobalToast] = useState('');
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleViewAll, setConsoleViewAll] = useState(false);

  const addConsoleLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    setConsoleLogs(prev => [...prev, `[${ts}] ${msg}`]);
  };

  const [homeCardBg, setHomeCardBg] = useState<string | null>(() => localStorage.getItem('homeCardBg'));
  const [homeCardAvatar, setHomeCardAvatar] = useState<string | null>(() => localStorage.getItem('homeCardAvatar'));
  const [homeName, setHomeName] = useState<string>(() => localStorage.getItem('homeName') || 'puppy');
  const [homeId, setHomeId] = useState<string>(() => localStorage.getItem('homeId') || '@zonyonee_ㅎ');
  const [homeQuote, setHomeQuote] = useState<string>(() => localStorage.getItem('homeQuote') || '雪是謊言的第二滴淚');
  const [homeLocation, setHomeLocation] = useState<string>(() => localStorage.getItem('homeLocation') || '台北, 台灣');
  const [desktopBg, setDesktopBg] = useState<string | null>(() => localStorage.getItem('desktopBg'));

  const fileInputRefBg = useRef<HTMLInputElement>(null);
  const fileInputRefAv = useRef<HTMLInputElement>(null);

  const [desktopApps, setDesktopApps] = useState(() => {
    const saved = localStorage.getItem('os_desktop_apps_v3');
      const defaultApps = [
        { id: '11', iconKey: 'memories', label: '记忆', screen: 'memory' },
        { id: '10', iconKey: 'cangxu', label: '藏叙', screen: 'cangxu' },
      { id: '1', iconKey: 'weather', label: '天气', screen: 'weather' },
{ id: '2', iconKey: 'calendar', label: '你我之间', screen: 'youandme' },
      { id: '3', iconKey: 'wechat', label: '微信', screen: 'wechat' },
      { id: '4', iconKey: 'huaji', label: '花集', screen: 'huaji' },
      { id: '5', iconKey: 'worldbook', label: '世界书', screen: 'worldbook' },
      { id: '6', iconKey: 'device', label: '查手机', screen: 'check_phone' },
      { id: '12', iconKey: 'feature_intro', label: '功能介绍', screen: 'feature_intro' },
    ];
    if (saved) {
      try {
        let parsed = JSON.parse(saved);
        // 过滤掉已删除的 jice 图标
        parsed = parsed.filter((a: any) => a.iconKey !== 'jice');
        
        // 检查并添加所有缺失的默认APP（确保新增APP能显示）
        defaultApps.forEach(defApp => {
          if (!parsed.find((a: any) => a.iconKey === defApp.iconKey)) {
            // 新APP添加到列表末尾
            parsed.push(defApp);
          }
        });
        
        // 用代码中的 defaultApps 覆盖缓存里的 label/screen，保证改动立即生效
        parsed = parsed.map((a: any) => {
          const def = defaultApps.find((d: any) => d.iconKey === a.iconKey);
          return def ? { ...a, label: def.label, screen: def.screen } : a;
        });
        return parsed;
      } catch (e) {}
    }
    return defaultApps;
  });

  const [desktopAppsPage2, setDesktopAppsPage2] = useState(() => {
    const saved = localStorage.getItem('os_desktop_apps_p2_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.filter((a: any) => a.iconKey !== 'jice');
      } catch (e) {}
    }
    return [
      { id: '8', iconKey: 'secret', label: '偷偷', screen: null },
      { id: '7', iconKey: 'accounting', label: '记账', screen: null },
      { id: '9', iconKey: 'period', label: '经期记录', screen: null },
    ];
  });

  const [currentPage, setCurrentPage] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  React.useEffect(() => {
    localStorage.setItem('os_desktop_apps_v3', JSON.stringify(desktopApps));
  }, [desktopApps]);

  React.useEffect(() => {
    localStorage.setItem('os_desktop_apps_p2_v3', JSON.stringify(desktopAppsPage2));
  }, [desktopAppsPage2]);

  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { // Use PointerSensor, but require delay for drag so normal clicks work
      activationConstraint: {
        delay: 250, // Long press to drag
        tolerance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [isEditingApps, setIsEditingApps] = useState(false);

  const handleDragStart = (event: any) => {
    const { active } = event;
    setActiveId(active.id);
    setIsEditingApps(true); // Enter jiggle mode if desired
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setDesktopApps((items: any) => {
        const oldIndex = items.findIndex((i: any) => i.id === active.id);
        const newIndex = items.findIndex((i: any) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const iconMap: Record<string, React.ReactNode> = {
    weather: <IconWeather />,
    calendar: <IconYouAndMe />,
    wechat: <IconWechat />,
    huaji: <IconHuaji />,
    worldbook: <IconWorldbook />,
    device: <IconDevice />,
    accounting: <IconAccounting />,
    secret: <IconSecret />,
    period: <IconPeriod />,
    cangxu: <IconCangxu />,
    memories: <IconMemories />,
    feature_intro: <IconFeatureIntro />,
  };

  const handleAppClick = (screen: any) => {
    if (isEditingApps) {
      setIsEditingApps(false); // Disable edit mode on tap
      return;
    }
    if (screen) {
      setCurrentScreen(screen);
    }
  };

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

  // Apply fullscreen mode class on mount based on saved setting
  React.useEffect(() => {
    const isFullscreen = localStorage.getItem('desktop_fullscreen_mode') === 'true';
    if (isFullscreen) {
      document.documentElement.classList.add('fullscreen-mode');
    } else {
      document.documentElement.classList.remove('fullscreen-mode');
    }
  }, []);

  // Sync body background with desktop wallpaper so safe-area inset region
  // shows the same background instead of a white gap (Safari)
  React.useEffect(() => {
    if (desktopBg) {
      document.body.style.background = `url(${desktopBg}) center/cover no-repeat`;
    } else {
      document.body.style.background = 'linear-gradient(135deg, #fff0f5 0%, #ffe4e1 100%)';
    }
  }, [desktopBg]);

  const [editModal, setEditModal] = useState<{isOpen: boolean, title: string, value: string, setterKey: string, setter: (v: string) => void} | null>(null);

  const openTextEdit = (title: string, current: string, key: string, setter: (v: string) => void) => {
    setEditModal({ isOpen: true, title, value: current, setterKey: key, setter });
  };

  React.useEffect(() => {
    localStorage.setItem('os_personas', JSON.stringify(personas));
  }, [personas]);

  React.useEffect(() => {
    localStorage.setItem('os_wechat_friends', JSON.stringify(wechatFriends));
  }, [wechatFriends]);

  React.useEffect(() => {
    localStorage.setItem('os_wechat_reqs', JSON.stringify(wechatRequests));
  }, [wechatRequests]);

  const loadChatsFromDB = React.useCallback(() => {
    ChatDB.messages.toArray().then(messages => {
      const chats: Record<string, any[]> = {};
      messages.forEach(msg => {
        if (!chats[msg.contactId]) {
          chats[msg.contactId] = [];
        }
        chats[msg.contactId].push({
          id: msg.id,
          text: msg.text,
          isMe: msg.isMe,
          timestamp: msg.fullTimestamp,
          fullTimestamp: msg.fullTimestamp,
          msgType: msg.msgType,
          mindCard: msg.mindCard ?? null,
          recalledContent: msg.recalledContent ?? null,
        });
      });
      // Sort messages within each chat by timestamp
      Object.keys(chats).forEach(contactId => {
        chats[contactId].sort((a, b) => a.timestamp - b.timestamp);
      });
      setWechatChats(chats);
    }).catch(err => console.error("Failed to load messages", err));
  }, []);

  React.useEffect(() => {
    loadChatsFromDB();
  }, [loadChatsFromDB]);

  // 监听外部写入 DB 的事件（如 MissAV 分享）
  React.useEffect(() => {
    const handler = () => loadChatsFromDB();
    window.addEventListener('chat-db-updated', handler);
    return () => window.removeEventListener('chat-db-updated', handler);
  }, [loadChatsFromDB]);

  const showGlobalToast = (msg: string) => {
    setGlobalToast(msg);
    setTimeout(() => setGlobalToast(''), 2500);
  };

  const handleTriggerAI = async (friendId: string) => {
    const friend = personas.find(p => p.id === friendId) || wechatFriends.find(f => f.id === friendId);
    if (!friend) return;
    const msgs = wechatChats[friendId] || [];
    
    const mandatoryMemSize = parseInt(localStorage.getItem('os_api_mandatory_mem') || '10', 10);
    const contextMemSize = Math.max(mandatoryMemSize, parseInt(localStorage.getItem('os_api_context_mem') || '50', 10));

    let recentMessages: any[] = [];
    let extraMessages: any[] = [];

    const userLastMsg = [...msgs].reverse().find(m => m.isMe);
    const userText = userLastMsg ? userLastMsg.text : '';

    if (userText && msgs.length > mandatoryMemSize) {
      const searchEndIdx = msgs.length - mandatoryMemSize;
      const searchStartIdx = Math.max(0, msgs.length - contextMemSize);
      const searchHistory = msgs.slice(searchStartIdx, searchEndIdx);
      
      const segs = userText.match(/[\u4e00-\u9fa5]{2,}|[a-zA-Z0-9]{3,}/g) || [];
      if (segs.length > 0) {
        const matchedIndices = new Set<number>();
        for (let i = 0; i < searchHistory.length; i++) {
          const histText = searchHistory[i].text;
          for (const seg of segs) {
            if (histText.includes(seg)) {
              matchedIndices.add(i);
              break;
            }
          }
        }
        
        const finalIndices = new Set<number>();
        for (const idx of matchedIndices) {
          if (idx > 0) finalIndices.add(idx - 1);
          finalIndices.add(idx);
          if (idx < searchHistory.length - 1) finalIndices.add(idx + 1);
        }
        
        const sortedIndices = Array.from(finalIndices).sort((a, b) => a - b);
        let lastIdx = -2;
        for (const idx of sortedIndices) {
          if (idx > lastIdx + 1 && extraMessages.length > 0) {
             extraMessages.push({ isSystem: true, text: '...\n' });
          }
          extraMessages.push(searchHistory[idx]);
          lastIdx = idx;
        }
      }
    }

    if (extraMessages.length > 0) {
      recentMessages.push({ isSystem: true, text: '==== 从历史记忆中唤起的相关片段 ====' });
      recentMessages.push(...extraMessages);
      recentMessages.push({ isSystem: true, text: '==== 当前最新对话 ====' });
    }
    // 通话系统标记（PHONE_CALL_START/HEART/END）不计入上下文条数，只取真正的对话消息
    const phoneCallSystemTexts = ['[PHONE_CALL_START]', '[PHONE_CALL_HEART]'];
    const dialogueMsgs = msgs.filter(m => !(m.msgType === 'system' && phoneCallSystemTexts.includes(m.text)));
    recentMessages.push(...dialogueMsgs.slice(-mandatoryMemSize));
    
    const context = await buildFullAIContext(friend, friendId, myProfile, recentMessages);
    if (!context || !(context as any).prompt) {
        showGlobalToast('未生成有效的提示词');
        return;
    }
    
    let useV2 = false;
    let useCoT = false;
    let cotStyle = '';
    const settingsRec = await AppDB.appSettings.get(`chat_settings_${friendId}`);
    if (settingsRec && settingsRec.value) {
        if (settingsRec.value.useV2Prompt) useV2 = true;
        if (settingsRec.value.useCoT) useCoT = true;
        if (settingsRec.value.cotStyle) cotStyle = settingsRec.value.cotStyle;
    }

    // 检测是否处于语音通话场景：最近 contextMemSize 条里有 PHONE_CALL_START 或 PHONE_CALL_HEART，
    // 且在那之后没有出现 PHONE_CALL_END（挂断后不应再视为通话中）
    const isPhoneCallScene = (() => {
      const recent = msgs.slice(-contextMemSize);
      // 找到最后一个 START 或 HEART 的位置
      let lastCallSignalIdx = -1;
      for (let i = recent.length - 1; i >= 0; i--) {
        const m = recent[i];
        if (m.msgType === 'system' && (m.text === '[PHONE_CALL_START]' || m.text === '[PHONE_CALL_HEART]')) {
          lastCallSignalIdx = i;
          break;
        }
      }
      if (lastCallSignalIdx === -1) return false;
      // 检查该位置之后是否有 PHONE_CALL_END，有则说明通话已结束
      const hasEndAfter = recent.slice(lastCallSignalIdx + 1).some(
        m => m.msgType === 'system' && typeof m.text === 'string' && m.text.startsWith('[PHONE_CALL_END:')
      );
      return !hasEndAfter;
    })();

    // 检测是否刚刚结束通话（最近消息中含有 PHONE_CALL_END，且不在通话中）
    const recentCallEndMsg = !isPhoneCallScene
      ? msgs.slice(-contextMemSize).reverse().find(
          m => m.msgType === 'system' && typeof m.text === 'string' && m.text.startsWith('[PHONE_CALL_END:')
        )
      : null;
    const recentCallEndDuration = recentCallEndMsg
      ? (recentCallEndMsg.text.match(/^\[PHONE_CALL_END:([\d:]+)\]$/)?.[1] || '')
      : '';

    // 构建最终 prompt
    let finalPrompt: string;
    if (isPhoneCallScene) {
      // 通话场景：使用电话专用 prompt
      const disableTimeAwareness = settingsRec?.value?.disableTimeAwareness || false;
      const aiTimezone = settingsRec?.value?.aiTimezone || '跟随用户';
      let nowTime: string;
      
      if (disableTimeAwareness) {
        // 停用时间感知时不读取时间
        nowTime = '';
      } else if (aiTimezone === '跟随用户') {
        // 跟随用户：使用用户所在时区（默认 Asia/Shanghai）
        nowTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
      } else {
        // 使用 AI 设定的时区
        try {
          nowTime = new Date().toLocaleString('zh-CN', { timeZone: aiTimezone });
        } catch (e) {
          console.warn(`时区 ${aiTimezone} 无效，回退到 Asia/Shanghai`, e);
          nowTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
        }
      }
      
      const timeContextValue = disableTimeAwareness
        ? '【时间感知说明】请忽略现实中的真实系统时间，根据聊天记录中的上下文推算当前时间线。\n'
        : `【系统当前时间】${nowTime}\n`;
      const formattedHistory = recentMessages.map((msg: any) => {
        if (msg.msgType === 'system') return `【系统】${msg.text}`;
        if (msg.msgType === 'narrator') {
          // 旁白：区分是用户还是 AI 说的
          return msg.isMe
            ? `${myProfile?.name || '我'}（旁白）：${msg.text}`
            : `${friend.name}（旁白）：${msg.text}`;
        }
        return `${msg.isMe ? myProfile?.name || '我' : friend.name}: ${msg.text || ''}`;
      }).join('\n');
      // 读取你我之间的日程和人设快照，注入到通话提示词（节省 token：只读必要字段）
      const _myScheduleItems = loadMySchedule();
      const _otherScheduleItems = loadOtherSchedule();
      const _personaSnapshot = loadPersonaSnapshot();
      // 构建日程上下文文本（仅在有数据时才注入，避免空白浪费 token）
      const myScheduleText = _myScheduleItems.length > 0
        ? `【用户日程】\n${scheduleItemsToText(_myScheduleItems)}`
        : '';
      const otherScheduleText = _otherScheduleItems.length > 0
        ? `【${friend.name}的日程】\n${scheduleItemsToText(_otherScheduleItems)}`
        : '';
      // 构建人设快照文本（优先用快照，快照不存在则跳过，aiPersonaInfo 已由 buildFullAIContext 提供）
      let snapshotPersonaText = '';
      if (_personaSnapshot && _personaSnapshot.id === friendId) {
        // 只在快照属于当前对话角色时才注入，避免串角
        const s = _personaSnapshot;
        const parts: string[] = [];
        if (s.mode === 'simple' || !s.mode) {
          if (s.bio) parts.push(`简介：${s.bio}`);
        } else {
          if (s.gender) parts.push(`性别：${s.gender}`);
          if (s.age) parts.push(`年龄：${s.age}`);
          if (s.identity) parts.push(`身份：${s.identity}`);
          if (s.personality) parts.push(`性格：${s.personality}`);
          if (s.relationship) parts.push(`与用户关系：${s.relationship}`);
          if (s.communication_style) parts.push(`说话风格：${s.communication_style}`);
          if (s.nsfw_info) parts.push(`私密特质：${s.nsfw_info}`);
        }
        if (parts.length > 0) {
          snapshotPersonaText = `【${s.name}人设补充（来自你我之间绑定）】\n${parts.join('\n')}`;
        }
      }
      const scheduleContext = [myScheduleText, otherScheduleText, snapshotPersonaText]
        .filter(Boolean)
        .join('\n\n');
      finalPrompt = buildPhoneCallPrompt({
        aiName: friend.name,
        wechatNickname: friend.wechat_remark || friend.name,
        aiPersona: (context as any).aiPersonaInfo || '',
        userPersona: (context as any).userPersonaInfo || '',
        relationship: (context as any).relationshipInfo || '',
        socialNetwork: (context as any).socialNetworkContent || '',
        worldbookContent: (context as any).worldbookContent || '',
        memoryContent: (context as any).memoryContent || '',
        letterContext: `\n【最近聊天记录】\n${formattedHistory}\n`,
        timeContext: timeContextValue,
        scheduleContext: scheduleContext || undefined,
      }, friend);
    } else {
      finalPrompt = (context as any).prompt as string;
      // 如果刚刚结束通话，向 AI 注入通话结束上下文，让 AI 知道电话已挂断
      if (recentCallEndMsg) {
        const callEndHint = recentCallEndDuration
          ? `\n\n【场景补充】你们刚刚通了一个电话（通话时长 ${recentCallEndDuration}），电话已经挂断，现在回到了微信文字聊天。请基于这通电话结束后的状态来回复。`
          : `\n\n【场景补充】你们刚刚通了一个电话，电话已经挂断，现在回到了微信文字聊天。请基于这通电话结束后的状态来回复。`;
        finalPrompt = `${finalPrompt}${callEndHint}`;
      }
      if (useCoT) {
        const cotInstruction = cotStyle.trim()
          ? cotStyle.trim()
          : '在每次回复之前，你必须先输出 <thinking> 标签，在其中深入分析角色心理、对话情境和最合适的回应方式，然后输出 </thinking>，最后再给出最终回复内容。';
        finalPrompt = `${finalPrompt}\n\n[线上思维链指令]\n${cotInstruction}`;
      }
    }

    // 注入我控道具提示词
    const woKongPrompt = getWoKongSystemPrompt(String(friendId));
    if (woKongPrompt) {
      finalPrompt = `${finalPrompt}${woKongPrompt}`;
    }

    setAiTypingStatus(prev => ({ ...prev, [friendId]: true }));
    try {
      addConsoleLog(`开始请求 AI (friendId: ${friendId})`);
      const prompt = finalPrompt;
      
      const apiUrl = (localStorage.getItem('os_api_url') || '').trim();
      const apiKey = (localStorage.getItem('os_api_key') || '').trim();
      const model = (localStorage.getItem('os_api_model') || '').trim();
      const tempStr = localStorage.getItem('os_api_temp');
      const temperature = tempStr !== null ? parseFloat(tempStr) : 0.7;

      if (!apiUrl || !apiKey || !model) {
        const errMsg = '请先在设置中配置 API 地址、密钥和模型';
        showGlobalToast(errMsg);
        addConsoleLog(`[ERROR] ${errMsg}`);
        return;
      }

      // 直接从浏览器调用 OpenAI 兼容 API（兼容静态部署和 Safari）
      let completionsUrl = apiUrl;
      if (!completionsUrl.endsWith('/chat/completions')) {
        completionsUrl = completionsUrl.endsWith('/') ? `${completionsUrl}chat/completions` : `${completionsUrl}/chat/completions`;
      }

      // Safari 对 fetch URL 校验严格，确保 URL 合法
      let validatedUrl: string;
      try {
        validatedUrl = new URL(completionsUrl).toString();
      } catch (_e) {
        showGlobalToast('API 地址格式不正确，请检查设置');
        return;
      }

      const response = await fetch(validatedUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: (() => {
            // 如果上下文中有图片，构建多模态 Vision 格式的 content
            const imgs: string[] = (context as any).imageMessages || [];
            if (imgs.length > 0) {
              const contentParts: any[] = [{ type: 'text', text: prompt }];
              imgs.forEach((imgBase64: string) => {
                contentParts.push({
                  type: 'image_url',
                  image_url: { url: imgBase64 }
                });
              });
              return contentParts;
            }
            return prompt;
          })() }],
          temperature: temperature,
          stream: false
        })
      });

      // 增强 HTTP 状态拦截：优先检查状态码，提取真实后端报错信息
      if (!response.ok) {
        let errDetail = '';
        try {
          errDetail = await response.text();
        } catch (_e) {
          errDetail = '无法读取错误详情';
        }
        const httpErr = `API 请求失败 (${response.status}): ${errDetail.substring(0, 300)}`;
        console.error(`[AI Chat] HTTP ${response.status} 错误:`, errDetail);
        addConsoleLog(`[ERROR] ${httpErr}`);
        throw new Error(httpErr);
      }

      let data: { text?: string; error?: string };

      // 检查响应是否为流式 SSE（某些 API 即使设置 stream:false 仍返回流式数据）
      const contentType = response.headers.get('content-type') || '';
      console.log('[AI Chat] Response content-type:', contentType);

      if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
        // 流式 SSE 响应：使用 reader 逐块读取并拼接内容
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('无法读取响应流（response.body 为空）');
        }
        const decoder = new TextDecoder('utf-8');
        let fullText = '';
        let buffer = '';
        let chunkCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          chunkCount++;
          console.log(`[AI Chat] Raw Stream Chunk #${chunkCount}:`, chunk);
          buffer += chunk;

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            // 跳过 SSE 注释行
            if (trimmed.startsWith(':')) continue;
            if (!trimmed.startsWith('data:')) {
              console.log('[AI Chat] 非 data 行，跳过:', trimmed);
              continue;
            }
            const jsonStr = trimmed.slice(5).trim();
            if (jsonStr === '[DONE]') {
              console.log('[AI Chat] 收到 [DONE] 标记');
              continue;
            }
            if (!jsonStr) continue;
            try {
              const parsed = JSON.parse(jsonStr);
              // 优先尝试流式 delta 格式
              const delta = parsed.choices?.[0]?.delta?.content;
              if (typeof delta === 'string') {
                fullText += delta;
              }
              // 也兼容非流式 JSON 格式被意外包装在 data: 中的情况
              const directContent = parsed.choices?.[0]?.message?.content;
              if (typeof directContent === 'string') {
                fullText += directContent;
              }
              // 兼容某些 API 直接返回 text 字段
              if (!delta && !directContent && typeof parsed.text === 'string') {
                fullText += parsed.text;
              }
            } catch (parseErr) {
              console.warn('[AI Chat] SSE JSON 解析失败:', jsonStr, parseErr);
            }
          }
        }
        // 处理 buffer 中可能残留的最后一行
        if (buffer.trim()) {
          const trimmed = buffer.trim();
          if (trimmed.startsWith('data:')) {
            const jsonStr = trimmed.slice(5).trim();
            if (jsonStr && jsonStr !== '[DONE]') {
              try {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (typeof delta === 'string') fullText += delta;
                const directContent = parsed.choices?.[0]?.message?.content;
                if (typeof directContent === 'string') fullText += directContent;
                if (!delta && !directContent && typeof parsed.text === 'string') fullText += parsed.text;
              } catch (_e) {}
            }
          }
        }
        console.log(`[AI Chat] 流式读取完成，共 ${chunkCount} 个块，拼接文本长度: ${fullText.length}`);
        data = fullText ? { text: fullText } : { error: `API 流式响应为空（共读取 ${chunkCount} 个块）` };
      } else {
        // 标准 JSON 响应（或伪装成 JSON 的 SSE）
        const rawText = await response.text();
        console.log('[AI Chat] 响应原始文本前200字符:', rawText.substring(0, 200));

        // 兼容：即使 content-type 是 application/json，内容也可能是 SSE 格式
        if (rawText.trimStart().startsWith('data:')) {
          console.log('[AI Chat] 检测到 data: 前缀，按 SSE 格式解析');
          let fullText = '';
          const lines = rawText.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith(':')) continue;
            if (!trimmed.startsWith('data:')) continue;
            const jsonStr = trimmed.slice(5).trim();
            if (jsonStr === '[DONE]' || !jsonStr) continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (typeof delta === 'string') fullText += delta;
              const directContent = parsed.choices?.[0]?.message?.content;
              if (typeof directContent === 'string') fullText += directContent;
              if (!delta && !directContent && typeof parsed.text === 'string') fullText += parsed.text;
            } catch (parseErr) {
              console.warn('[AI Chat] SSE 行解析失败:', trimmed, parseErr);
            }
          }
          data = fullText ? { text: fullText } : { error: `API SSE 响应解析为空，原始内容: ${rawText.substring(0, 150)}` };
        } else {
          try {
            const rawData = JSON.parse(rawText);
            if (rawData.choices && rawData.choices.length > 0 && rawData.choices[0].message) {
              data = { text: rawData.choices[0].message.content };
            } else if (rawData.text) {
              data = { text: rawData.text };
            } else if (rawData.error) {
              data = { error: typeof rawData.error === 'string' ? rawData.error : JSON.stringify(rawData.error) };
            } else {
              data = { error: `API 返回格式异常: ${rawText.substring(0, 150)}` };
            }
          } catch (_e) {
            data = { error: `无法解析 API 响应: ${rawText.substring(0, 150)}` };
          }
        }
      }
      
      if (data.text) {
        let msgsToSave = [data.text];
        let mindCardData: any = null;
        if (useV2) {
           try {
             let jsonStr = data.text.trim();
             // 剥离 <thinking>/<thought> 标签（CoT 开启时 AI 可能在 JSON 前输出思考块）
             jsonStr = jsonStr.replace(/<(thinking|thought)>[\s\S]*?<\/\1>/gi, '').trim();
             if (jsonStr.startsWith("```json")) {
                 jsonStr = jsonStr.substring(7);
                 if (jsonStr.endsWith("```")) jsonStr = jsonStr.substring(0, jsonStr.length - 3);
             } else if (jsonStr.startsWith("```")) {
                 jsonStr = jsonStr.substring(3);
                 if (jsonStr.endsWith("```")) jsonStr = jsonStr.substring(0, jsonStr.length - 3);
             }
             jsonStr = jsonStr.trim();
             
             const parsed = JSON.parse(jsonStr);
             if (parsed && typeof parsed.reply === 'string') {
                 if (parsed.mind_card) {
                     mindCardData = parsed.mind_card;
                 }
                 let rawMsgs = parsed.reply.split('|||').map((s: string) => s.trim()).filter(Boolean);
                 msgsToSave = [];
                 for (let i = 0; i < rawMsgs.length; i++) {
                     let msgText = rawMsgs[i];
                     if (msgText.match(/^\[引用:(.*?)\]$/) && i + 1 < rawMsgs.length) {
                         msgText = msgText + '\n' + rawMsgs[i + 1];
                         i++; // skip next since it's merged
                     }
                     const tMatch = msgText.match(/^\[TRANSFER:(.*?):(.[^:]*)\]$/);
                     if (tMatch) {
                         msgText = `[TRANSFER:${tMatch[1]}:${tMatch[2]}:SENT]`;
                     }
                     msgsToSave.push(msgText);
                 }
                 if (msgsToSave.length === 0) msgsToSave = [data.text];
             }
           } catch (e) {
             console.error("V2 解析失效降级使用原始内容", e);
           }
        }

        // 辅助函数：将一条消息分解为旁白和气泡片段
        const splitNarratorAndBubble = (text: string) => {
            const segments: Array<{ type: 'narrator' | 'bubble', text: string }> = [];
            let currentIdx = 0;
            
            // 检查是否包含对话标记
            const hasDialogue = text.includes('「') && text.includes('」');
            
            if (!hasDialogue) {
                // 没有对话标记，整条都是旁白，按段落拆分
                const paragraphs = text.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
                for (const para of paragraphs) {
                    segments.push({ type: 'narrator', text: para });
                }
            } else {
                // 有对话标记，需要分离旁白和气泡
                while (currentIdx < text.length) {
                    const startQuote = text.indexOf('「', currentIdx);
                    
                    if (startQuote === -1) {
                        // 没有更多引号了，剩余部分是旁白，按自然段拆分
                        const narratorText = text.substring(currentIdx).trim();
                        if (narratorText) {
                            const paras = narratorText.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
                            for (const para of paras) segments.push({ type: 'narrator', text: para });
                        }
                        break;
                    }
                    
                    // startQuote 之前的是旁白，按自然段拆分
                    if (startQuote > currentIdx) {
                        const narratorText = text.substring(currentIdx, startQuote).trim();
                        if (narratorText) {
                            const paras = narratorText.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
                            for (const para of paras) segments.push({ type: 'narrator', text: para });
                        }
                    }
                    
                    // 找到结束引号
                    const endQuote = text.indexOf('」', startQuote + 1);
                    if (endQuote === -1) {
                        // 没有结束引号，剩余部分作为旁白，按自然段拆分
                        const narratorText = text.substring(startQuote).trim();
                        if (narratorText) {
                            const paras = narratorText.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
                            for (const para of paras) segments.push({ type: 'narrator', text: para });
                        }
                        break;
                    }
                    
                    // 提取气泡内容（包含引号）
                    const bubbleText = text.substring(startQuote, endQuote + 1);
                    segments.push({ type: 'bubble', text: bubbleText });
                    
                    currentIdx = endQuote + 1;
                }
            }
            
            return segments;
        };

        const currentTs = Date.now();
        const allMessagesToAdd: any[] = [];
        
        // 判断本次回复是否来自 V2 JSON 解析成功（线上模式）
        // V2 JSON 模式下，reply 中的消息就是气泡消息，不需要再走旁白分离逻辑
        // 只有线下模式（JSON 解析失败、使用「」文本）才需要 splitNarratorAndBubble
        let isV2JsonMode = false;
        if (useV2) {
            try {
                let testStr = data.text!.trim();
                // 剥离 <thinking>/<thought> 标签
                testStr = testStr.replace(/<(thinking|thought)>[\s\S]*?<\/\1>/gi, '').trim();
                if (testStr.startsWith("```json")) testStr = testStr.substring(7);
                else if (testStr.startsWith("```")) testStr = testStr.substring(3);
                if (testStr.endsWith("```")) testStr = testStr.substring(0, testStr.length - 3);
                testStr = testStr.trim();
                const testParsed = JSON.parse(testStr);
                if (testParsed && typeof testParsed.reply === 'string') {
                    isV2JsonMode = true;
                }
            } catch (e) {
                isV2JsonMode = false;
            }
        }
        
        // 线下模式：从原始文本中提取 [MIND_CARD] 标记
        if (!mindCardData) {
            const fullText = msgsToSave.join('\n');
            const mindCardRegex = /\[MIND_CARD\]([\s\S]*?)\[\/MIND_CARD\]/;
            const mindCardMatch = fullText.match(mindCardRegex);
            if (mindCardMatch) {
                // 从所有消息中移除 MIND_CARD 标记
                for (let i = 0; i < msgsToSave.length; i++) {
                    msgsToSave[i] = msgsToSave[i].replace(mindCardRegex, '').trim();
                }
                // 解析心声卡片内容
                const lines = mindCardMatch[1].split('\n');
                mindCardData = {};
                lines.forEach((line: string) => {
                    if (line.includes('：')) {
                        const [k, ...v] = line.split('：');
                        const keyStr = k.trim();
                        const valStr = v.join('：').trim();
                        if (keyStr === '着装') mindCardData.attire = valStr;
                        else if (keyStr === '动作' || keyStr === '行为') mindCardData.action = valStr;
                        else if (keyStr === '心思' || keyStr === '真实心声' || keyStr === '心声') mindCardData.thought = valStr;
                        else if (keyStr === '阴暗面') mindCardData.dark_side = valStr;
                    } else if (line.includes(':')) {
                        const [k, ...v] = line.split(':');
                        const keyStr = k.trim();
                        const valStr = v.join(':').trim();
                        if (keyStr === '着装') mindCardData.attire = valStr;
                        else if (keyStr === '动作' || keyStr === '行为') mindCardData.action = valStr;
                        else if (keyStr === '心思' || keyStr === '真实心声' || keyStr === '心声') mindCardData.thought = valStr;
                        else if (keyStr === '阴暗面') mindCardData.dark_side = valStr;
                    }
                });
                // 如果解析出来是空对象，置为 null
                if (Object.keys(mindCardData).length === 0) mindCardData = null;
            }
        }

        for (let i = 0; i < msgsToSave.length; i++) {
            let rtext = msgsToSave[i];
            
            if (rtext.includes('[ACTION:ACCEPT_TRANSACTION]') || rtext.includes('[ACTION:REJECT_TRANSACTION]')) {
                const isAccept = rtext.includes('[ACTION:ACCEPT_TRANSACTION]');
                try {
                    const history = await ChatDB.messages.where('contactId').equals(friendId).sortBy('fullTimestamp');
                    let amount = '';
                    let title = '';
                    for (let j = history.length - 1; j >= 0; j--) {
                        const m: any = history[j];
                        if (m.isMe && m.text.startsWith('[TRANSFER:') && m.text.endsWith(':SENT]')) {
                            const newText = m.text.replace(':SENT]', isAccept ? ':ACCEPTED]' : ':REJECTED]');
                            await ChatDB.messages.update(m.id, { text: newText });
                            
                            const match = m.text.match(/^\[TRANSFER:(.*?):(.*?):SENT\]$/);
                            if (match) {
                                amount = match[1];
                                title = match[2];
                            }
                            
                            setWechatChats(prev => {
                                const existing = prev[friendId] || [];
                                return {
                                    ...prev,
                                    [friendId]: existing.map(e => e.id === m.id ? { ...e, text: newText } : e)
                                };
                            });
                            break;
                        }
                    }
                    
                    if (amount) {
                        if (!isAccept) {
                            try {
                                const saved = localStorage.getItem('wechat_wallet_balance');
                                const balance = saved ? parseFloat(saved) : 1000.00;
                                localStorage.setItem('wechat_wallet_balance', (balance + parseFloat(amount)).toString());
                                window.dispatchEvent(new Event('wallet_balance_updated'));
                            } catch (err) { }
                        }
                        
                        const rtext2 = isAccept ? '对方接受了您的转账' : '对方拒绝了你的转账';
                        allMessagesToAdd.push({
                            text: rtext2,
                            msgType: 'narrator',
                            mindCard: null
                        });
                    }
                } catch (e) {
                    console.error("Error processing transaction action", e);
                }
                
                // If there's other text in the reply, we might still want to show it.
                // But generally action replies are just the action.
                const cleanText = rtext.replace(/\[ACTION:(ACCEPT|REJECT)_TRANSACTION\]/g, '').trim();
                if (!cleanText) {
                    continue;
                }
                rtext = cleanText; // Let the rest of the loop process the clean text
            }

            const isLast = i === msgsToSave.length - 1;
            
            // 检查是否是特殊消息（转账、红包等）
            const isSpecialMsg = rtext.startsWith('[红包]') || rtext.startsWith('[TRANSFER:') || rtext.match(/^\[image:.*\]$/);
            
            if (isSpecialMsg) {
                allMessagesToAdd.push({
                    text: rtext,
                    msgType: 'text',
                    mindCard: null
                });
            } else if (isV2JsonMode) {
                // V2 线上 JSON 模式：reply 里的内容就是气泡消息，直接作为 text 类型
                // 不需要经过 splitNarratorAndBubble（那是给线下「」文本用的）
                allMessagesToAdd.push({
                    text: rtext,
                    msgType: 'text',
                    mindCard: null
                });
            } else {
                // 线下模式或非V2模式：分离旁白和气泡
                const segments = splitNarratorAndBubble(rtext);
                
                for (let segIdx = 0; segIdx < segments.length; segIdx++) {
                    const segment = segments[segIdx];
                    allMessagesToAdd.push({
                        text: segment.text,
                        msgType: segment.type === 'narrator' ? 'narrator' : 'text',
                        mindCard: null
                    });
                }
            }
        }
        
        // 将心声卡片绑定到最后一条气泡消息上
        if (mindCardData) {
            for (let idx = allMessagesToAdd.length - 1; idx >= 0; idx--) {
                if (allMessagesToAdd[idx].msgType === 'text') {
                    allMessagesToAdd[idx].mindCard = mindCardData;
                    break;
                }
            }
        }
        
        // 一次性批量添加所有消息到数据库和状态，使用延迟间隔显示
        for (let idx = 0; idx < allMessagesToAdd.length; idx++) {
            const msg = allMessagesToAdd[idx];
            const isFirst = idx === 0;
            
            // 第一条消息立即显示，后续消息有间隔（1.5-2.5秒随机）
            if (!isFirst) {
                const delay = 1500 + Math.random() * 1000; // 1.5-2.5秒随机延迟
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            try {
                const ts = currentTs + idx;
                const msgObj: any = {
                    contactId: friendId,
                    fullTimestamp: ts,
                    text: msg.text,
                    isMe: false,
                    msgType: msg.msgType
                };
                if (msg.mindCard) {
                    msgObj.mindCard = msg.mindCard;
                }
                const newId = await ChatDB.messages.add(msgObj);
                
                setWechatChats(prev => {
                    const existing = prev[friendId] || [];
                    const stateMsg: any = { 
                        id: newId as number, 
                        text: msg.text, 
                        isMe: false, 
                        timestamp: ts,
                        fullTimestamp: ts,
                        msgType: msg.msgType 
                    };
                    if (msg.mindCard) stateMsg.mindCard = msg.mindCard;
                    return { 
                        ...prev, 
                        [friendId]: [...existing, stateMsg] 
                    };
                });

                // ── 状态机推进：每条 AI 消息（非 system）触发 tickProp ──
                if (msg.msgType !== 'system') {
                    const tickResult = tickProp(String(friendId), 'ai', msg.text || '');
                    if (tickResult.action === 'expired' || tickResult.action === 'pendingTimeout') {
                        // 退场 / 超时旁白
                        const narrationTs = ts + 1;
                        const narrationObj: any = {
                            contactId: friendId,
                            fullTimestamp: narrationTs,
                            text: tickResult.narration,
                            isMe: false,
                            msgType: 'narrator',
                        };
                        try {
                            const narId = await ChatDB.messages.add(narrationObj);
                            setWechatChats(prev => {
                                const existing = prev[friendId] || [];
                                return {
                                    ...prev,
                                    [friendId]: [...existing, {
                                        id: narId as number,
                                        text: tickResult.narration,
                                        isMe: false,
                                        timestamp: narrationTs,
                                        fullTimestamp: narrationTs,
                                        msgType: 'narrator',
                                    }],
                                };
                            });
                        } catch (narErr) {
                            console.error('[WoKong] Failed to save narration', narErr);
                        }
                    } else if (tickResult.action === 'activated') {
                        // pending → active：发入场触发旁白
                        const activatedRecord = getActiveRecord(String(friendId));
                        const snap = activatedRecord?.itemSnapshot as any;
                        const activationNarration = buildEntryNarration(
                            snap?.name || '',
                            snap?.emoji || '',
                            snap?.entryNarration || '',
                        );
                        const narrationTs = ts + 1;
                        const narrationObj: any = {
                            contactId: friendId,
                            fullTimestamp: narrationTs,
                            text: activationNarration,
                            isMe: false,
                            msgType: 'narrator',
                        };
                        try {
                            const narId = await ChatDB.messages.add(narrationObj);
                            setWechatChats(prev => {
                                const existing = prev[friendId] || [];
                                return {
                                    ...prev,
                                    [friendId]: [...existing, {
                                        id: narId as number,
                                        text: activationNarration,
                                        isMe: false,
                                        timestamp: narrationTs,
                                        fullTimestamp: narrationTs,
                                        msgType: 'narrator',
                                    }],
                                };
                            });
                        } catch (narErr) {
                            console.error('[WoKong] Failed to save activation narration', narErr);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to save AI message", err);
            }
        }
      } else {
        showGlobalToast(data.error ? `失败: ${data.error}` : 'AI 回复为空或失败');
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || 'AI 接口调用失败';
      showGlobalToast(errMsg);
      addConsoleLog(`[ERROR] ${errMsg}`);
      setConsoleOpen(true);
    } finally {
      setAiTypingStatus(prev => ({ ...prev, [friendId]: false }));
    }
  };

  const handleCreatePersonaSave = (persona: any, sendReq: boolean) => {
    setPersonas(prev => {
      const existing = prev.find(p => p.id === persona.id);
      if (existing) {
        return prev.map(p => p.id === persona.id ? persona : p);
      }
      return [persona, ...prev];
    });
    if (sendReq) {
      setWechatRequests(prev => {
        const existing = prev.find(p => p.id === persona.id);
        if (existing) {
          return prev.map(p => p.id === persona.id ? persona : p);
        }
        return [persona, ...prev];
      });
      setWechatFriends(prev => {
        const existing = prev.find(p => p.id === persona.id);
        if (existing) {
          return prev.map(p => p.id === persona.id ? persona : p);
        }
        return prev;
      });
      showGlobalToast('保存成功，已发送好友申请');
    } else {
      setWechatFriends(prev => {
        const existing = prev.find(p => p.id === persona.id);
        if (existing) {
          return prev.map(p => p.id === persona.id ? persona : p);
        }
        return prev;
      });
      showGlobalToast('保存成功');
    }
    setEditingPersona(null);
    setCurrentScreen('huaji');
  };

  return (
    <div 
      className="w-full flex justify-center overflow-hidden relative"
      style={{
        height: '100dvh',
        minHeight: '-webkit-fill-available',
        background: desktopBg 
          ? `url(${desktopBg}) center/cover no-repeat` 
          : 'linear-gradient(135deg, #fff0f5 0%, #ffe4e1 100%)'
      }}
    >
      {/* Edit Modal */}
      {editModal && editModal.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center pt-[100px] px-4">
           <div className="bg-white rounded-3xl p-6 w-full max-w-[320px] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
             <h3 className="text-[16px] font-bold text-gray-800 mb-4 text-center">{editModal.title}</h3>
             <input 
               type="text" 
               defaultValue={editModal.value}
               className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
               autoFocus
               onKeyDown={(e) => {
                 if (e.key === 'Enter') {
                   const val = e.currentTarget.value.trim();
                   if (val) {
                     editModal.setter(val);
                     localStorage.setItem(editModal.setterKey, val);
                     setEditModal(null);
                   }
                 }
               }}
             />
             <div className="flex gap-3 mt-6">
               <button 
                 onClick={() => setEditModal(null)}
                 className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium active:bg-gray-200 transition-colors"
               >
                 取消
               </button>
               <button 
                 onClick={(e) => {
                   const input = e.currentTarget.parentElement?.previousElementSibling as HTMLInputElement;
                   const val = input.value.trim();
                   if (val) {
                     editModal.setter(val);
                     localStorage.setItem(editModal.setterKey, val);
                     setEditModal(null);
                   }
                 }}
                 className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white font-medium active:bg-blue-600 transition-colors"
               >
                 确认
               </button>
             </div>
           </div>
        </div>
      )}

      {/* Global Toast */}
      {globalToast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 bg-gray-800/95 backdrop-blur text-white px-5 py-3 rounded-full text-[14px] font-medium shadow-xl z-[100] transition-opacity duration-300">
          {globalToast}
        </div>
      )}

      {/* iOS Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6 text-white pb-20">
          <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-xl border border-white/20 w-full max-w-sm flex flex-col items-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <Smartphone size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-center">解锁全屏沉浸体验</h2>
            <p className="text-white/80 text-center mb-8 text-[15px] leading-relaxed">
              为了获得无地址栏、无底栏的完美体验，请将本应用添加到主屏幕。
            </p>
            
            <div className="w-full space-y-4">
              <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">1</div>
                <div className="text-[15px]">点击底部导航栏的 <span className="font-bold">分享图标</span> <br/><span className="text-white/60 text-[13px]">(正中间的方框加向上箭头)</span></div>
              </div>
              <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">2</div>
                <div className="text-[15px]">下滑菜单，选择 <span className="font-bold">"添加到主屏幕"</span></div>
              </div>
              <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">3</div>
                <div className="text-[15px]">返回桌面，点击 <span className="font-bold">应用图标</span> 打开</div>
              </div>
            </div>
            
            <button 
              onClick={() => setShowInstallPrompt(false)}
              className="mt-8 text-white/50 text-[14px] underline underline-offset-4"
            >
              稍后再说 (保留浏览器原生UI)
            </button>
          </div>
          <div className="absolute bottom-[20px] sm:bottom-[30px] w-full flex justify-center animate-bounce">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4V20M12 20L6 14M12 20L18 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      )}

      {/* About Modal - 首次打开/版本更新时自动弹出 */}
      <AboutModal isOpen={showAboutOnLoad} onClose={handleCloseAboutOnLoad} />

      {/* OS Container */}
      <div 
        className="relative w-full max-w-7xl h-full sm:h-[95dvh] sm:my-auto sm:rounded-[40px] flex flex-col overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.05)] sm:border sm:border-gray-200/50"
        style={{
          background: desktopBg 
            ? `url(${desktopBg}) center/cover no-repeat` 
            : 'linear-gradient(135deg, #fff0f5 0%, #ffe4e1 100%)',
        }}
      >
        
        <AnimatePresence>
          {currentScreen === 'settings' && (
            <SettingsApp key="settings" onBack={() => setCurrentScreen('home')} desktopBg={desktopBg} />
          )}
          {currentScreen === 'wechat' && (
            <WechatScreen 
              key="wechat" 
              onBack={() => setCurrentScreen('home')} 
              requests={wechatRequests}
              friends={wechatFriends}
              chats={wechatChats}
              personas={personas}
              myProfile={myProfile}
              onOpenMyProfile={() => setCurrentScreen('my_profile')}
              onTriggerAI={handleTriggerAI}
              isTyping={aiTypingStatus}
              consoleLogs={consoleLogs}
              onClearConsoleLogs={() => setConsoleLogs([])}
              onSendMessage={(friendId, text, isMe, msgType, recalledContent) => {
                // narrator 类型：按段落拆分，每段独立存一条记录，确保可单独删除
                if (msgType === 'narrator' && !recalledContent) {
                  const paragraphs = text.split(/\n+/).map((s: string) => s.trim()).filter((s: string) => s);
                  const segments = paragraphs.length > 0 ? paragraphs : [text];
                  const baseTs = Date.now();
                  segments.forEach((seg, i) => {
                    const ts = baseTs + i;
                    ChatDB.messages.add({
                      contactId: friendId,
                      fullTimestamp: ts,
                      text: seg,
                      isMe: isMe,
                      msgType: 'narrator',
                    }).then((newId) => {
                      setWechatChats(prev => {
                        const msgs = prev[friendId] || [];
                        return { ...prev, [friendId]: [...msgs, { id: newId, text: seg, isMe, timestamp: ts, msgType: 'narrator' }] };
                      });
                    }).catch(err => console.error("Failed to save narrator segment", err));
                  });
                  return;
                }
                const ts = Date.now();
                ChatDB.messages.add({
                  contactId: friendId,
                  fullTimestamp: ts,
                  text: text,
                  isMe: isMe,
                  msgType: msgType,
                  recalledContent: recalledContent
                }).then((newId) => {
                  setWechatChats(prev => {
                    const msgs = prev[friendId] || [];
                    return { ...prev, [friendId]: [...msgs, { id: newId, text, isMe, timestamp: ts, msgType, recalledContent }] };
                  });
                }).catch(err => console.error("Failed to save message", err));
              }}
              onAcceptRequest={(id) => {
                const req = wechatRequests.find(r => r.id === id);
                if (req) {
                  setWechatFriends([...wechatFriends, req]);
                  setWechatRequests(wechatRequests.filter(r => r.id !== id));
                  showGlobalToast('已添加为好友');
                }
              }}
              onAddFriend={(persona) => {
                if (!wechatFriends.find(f => f.id === persona.id)) {
                  setWechatFriends([persona, ...wechatFriends]);
                  showGlobalToast('已添加为好友');
                } else {
                  showGlobalToast('已是好友');
                }
              }}
              onSetRemark={(friendId, remark) => {
                setWechatFriends(prev => prev.map(f => f.id === friendId ? { ...f, wechat_remark: remark } : f));
              }}
              onUpdateFriend={(friendId, data) => {
                setWechatFriends(prev => prev.map(f => f.id === friendId ? { ...f, ...data } : f));
                setPersonas(prev => prev.map(p => p.id === friendId ? { ...p, ...data } : p));
              }}
              onDeleteMessages={(friendId, messageIds) => {
                return ChatDB.messages.bulkDelete(messageIds).then(() => {
                  setWechatChats(prev => {
                    const msgs = prev[friendId] || [];
                    return { ...prev, [friendId]: msgs.filter(m => !messageIds.includes(m.id)) };
                  });
                }).catch(err => console.error("Failed to delete messages", err));
              }}
              onEditMessage={(friendId, msgId, newText) => {
                ChatDB.messages.update(msgId, { text: newText }).then(() => {
                  setWechatChats(prev => {
                    const msgs = prev[friendId] || [];
                    return { ...prev, [friendId]: msgs.map(m => m.id === msgId ? { ...m, text: newText } : m) };
                  });
                }).catch(err => console.error("Failed to edit message", err));
              }}
              onClearChat={(friendId) => {
                ChatDB.messages.where('contactId').equals(friendId).delete().then(() => {
                  ChatDB.memories.where('contactId').equals(friendId).delete().then(() => {
                    // 重置道具计数器：消息被删后，各种计数应归零/恢复初始值
                    const activeRec = getActiveRecord(friendId);
                    if (activeRec) {
                      const item = activeRec.itemSnapshot as any;
                      const initialCount = item?.end?.msgCount ?? null;
                      activeRec.msgCounterRemaining = initialCount;
                      activeRec.endHitCounter = 0;
                      activeRec.triggerHitCounter = 0;
                      activeRec.pendingMsgCounter = 0;
                      localStorage.setItem(`wokong_active_${friendId}`, JSON.stringify(activeRec));
                    }
                    setWechatChats(prev => {
                      const newChats = { ...prev };
                      delete newChats[friendId];
                      return newChats;
                    });
                    showGlobalToast('已清空');
                  });
                }).catch(err => {
                  console.error("Failed to clear chat", err);
                  showGlobalToast('清理失败');
                });
              }}
            />
          )}
          {currentScreen === 'huaji' && (
            <HuajiScreen key="huaji" onBack={() => setCurrentScreen('home')} onCreatePersona={() => { setEditingPersona(null); setCurrentScreen('create_persona'); }} onEditPersona={(p) => { setEditingPersona(p); setCurrentScreen('create_persona'); }} personas={personas} />
          )}
          {currentScreen === 'create_persona' && (
            <CreatePersonaScreen 
              key="create_persona" 
              onBack={() => { setEditingPersona(null); setCurrentScreen('huaji'); }} 
              onSave={handleCreatePersonaSave}
              initialData={editingPersona}
              personas={personas}
            />
          )}
          {currentScreen === 'my_profile' && (
            <MyProfileApp 
              key="my_profile"
              onBack={() => setCurrentScreen('wechat')} 
              myProfile={myProfile} 
              personas={personas}
              onSave={(profile) => {
                setMyProfile(profile);
                localStorage.setItem('os_my_profile', JSON.stringify(profile));
                
                // Add relationship targets to WeChat friends if isWechatFriend is true
                if (profile.relationships && profile.relationships.length > 0) {
                  setWechatFriends(prev => {
                    let next = [...prev];
                    profile.relationships.forEach((rel: any) => {
                      if (rel.isWechatFriend) {
                        const targetPersona = personas.find(p => p.id === rel.targetId);
                        if (targetPersona && !next.find(f => f.id === targetPersona.id)) {
                          next.push(targetPersona);
                        }
                      }
                    });
                    return next;
                  });
                }
                
                setCurrentScreen('wechat');
              }} 
            />
          )}
          {currentScreen === 'worldbook' && (
            <WorldbookScreen key="worldbook" onBack={() => setCurrentScreen('home')} />
          )}
          {currentScreen === 'theme' && (
            <ThemeScreen 
              key="theme" 
              onBack={() => setCurrentScreen('home')} 
              desktopBg={desktopBg} 
              onUpdateDesktopBg={setDesktopBg} 
            />
          )}
          {currentScreen === 'memory' && (
            <MemoryScreen 
              key="memory"
              onBack={() => setCurrentScreen('home')}
              personas={personas}
            />
          )}
          {currentScreen === 'youandme' && (
            <YouAndMeScreen 
              key="youandme"
              onClose={() => setCurrentScreen('home')}
              personas={personas}
              myProfile={myProfile}
            />
          )}
          {currentScreen === 'weather' && (
            <WeatherScreen 
              key="weather"
              onBack={() => setCurrentScreen('home')}
            />
          )}
          {currentScreen === 'cangxu' && (
            <CangxuScreen 
              key="cangxu"
              onClose={() => setCurrentScreen('home')}
              personas={personas}
              myProfile={myProfile}
            />
          )}
          {currentScreen === 'check_phone' && (
            <CheckPhoneScreen 
              key="check_phone"
              onBack={() => setCurrentScreen('home')}
              personas={personas}
            />
          )}
          {currentScreen === 'feature_intro' && (
            <FeatureIntroScreen 
              key="feature_intro"
              onBack={() => setCurrentScreen('home')}
            />
          )}
        </AnimatePresence>

        {/* Desktop Screen Content (Type A: Fixed, No Scroll) */}
        <div className="flex-1 w-full relative z-10 flex flex-col overflow-hidden">

          {/* Main Desktop Layout */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* App Grid Layer */}
          <div 
              className="flex-1 min-h-0 flex flex-col justify-end relative overflow-hidden"
              onTouchStart={(e) => {
                const touch = e.touches[0];
                const startX = touch.clientX;
                let currentX = startX;
                
                const handleTouchMove = (moveEvent: TouchEvent) => {
                  currentX = moveEvent.touches[0].clientX;
                };
                
                const handleTouchEnd = () => {
                  const diff = startX - currentX;
                  if (diff > 50 && currentPage === 0) {
                    setCurrentPage(1);
                  } else if (diff < -50 && currentPage === 1) {
                    setCurrentPage(0);
                  }
                  document.removeEventListener('touchmove', handleTouchMove);
                  document.removeEventListener('touchend', handleTouchEnd);
                };
                
                document.addEventListener('touchmove', handleTouchMove);
                document.addEventListener('touchend', handleTouchEnd);
              }}
              onMouseDown={(e) => {
                const startX = e.clientX;
                let currentX = startX;
                
                const handleMouseMove = (moveEvent: MouseEvent) => {
                  currentX = moveEvent.clientX;
                };
                
                const handleMouseUp = () => {
                  const diff = startX - currentX;
                  if (diff > 50 && currentPage === 0) {
                    setCurrentPage(1);
                  } else if (diff < -50 && currentPage === 1) {
                    setCurrentPage(0);
                  }
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            >
              <div 
                className="flex transition-transform duration-300 ease-in-out"
                style={{ transform: `translateX(-${currentPage * 100}%)` }}
              >
                {/* Page 1 with Card */}
                <div className="w-full flex-shrink-0 flex flex-col">
                  {/* Main Home Card */}
                  <div className="mx-4 sm:mx-12 md:mx-20 lg:mx-32 mb-4 relative rounded-[32px] sm:rounded-[48px] overflow-hidden flex flex-col shrink-0 h-[32vh] sm:h-[38vh] max-h-[320px] sm:max-h-[400px] lg:max-h-[500px] shadow-sm">
              
              {/* Full Background Image */}
              <div 
                className="absolute inset-0 bg-black/5 cursor-pointer z-0 [mask-image:linear-gradient(to_bottom,black_40%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_40%,transparent_100%)] transition-transform hover:scale-105 duration-700"
                onClick={() => fileInputRefBg.current?.click()}
              >
                <input type="file" ref={fileInputRefBg} onChange={(e) => handleImageUpload(e, setHomeCardBg, 'homeCardBg')} className="hidden" accept="image/*" />
                {homeCardBg ? (
                   <img src={homeCardBg} alt="background" className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full flex flex-col items-center justify-center opacity-40 hover:opacity-70 transition-opacity pb-[20vh]">
                      <Camera size={26} strokeWidth={1} className="text-gray-600 mb-2 sm:scale-125 lg:scale-150" />
                      <span className="text-[10px] sm:text-[14px] text-gray-500">点击上传背景</span>
                   </div>
                )}
              </div>

              {/* Spacer for top image area, proportional */}
              <div className="h-[45%] sm:h-[50%] w-full flex-shrink-0 z-10 pointer-events-none"></div>

              {/* Content Container (Card over image) */}
              <div className="flex-1 flex flex-col relative z-10 mt-[-24px] sm:mt-[-40px]">
                {/* Content Background with transparent gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-white/80 to-transparent rounded-t-[32px] sm:rounded-t-[48px] pointer-events-none"></div>
                
                {/* Avatar */}
                <div 
                   className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[45%] w-[84px] sm:w-[120px] lg:w-[160px] h-[84px] sm:h-[120px] lg:h-[160px] bg-white rounded-full p-[3px] sm:p-[5px] shadow-[0_4px_12px_rgba(0,0,0,0.05)] cursor-pointer z-20 shrink-0 transition-transform hover:scale-105"
                   onClick={() => fileInputRefAv.current?.click()}
                >
                  <input type="file" ref={fileInputRefAv} onChange={(e) => handleImageUpload(e, setHomeCardAvatar, 'homeCardAvatar')} className="hidden" accept="image/*" />
                  <div className="w-full h-full rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                     {homeCardAvatar ? (
                        <img src={homeCardAvatar} alt="avatar" className="w-full h-full object-cover" />
                     ) : (
                        <User size={24} strokeWidth={1} className="text-gray-400 sm:scale-150 lg:scale-[2]" />
                     )}
                  </div>
                </div>

                {/* Text Content */}
                <div className="relative z-10 flex-1 flex flex-col items-center pt-[50px] sm:pt-[70px] lg:pt-[90px] pb-6 sm:pb-10 pl-4 pr-4">
                   <div 
                     className="text-[20px] sm:text-[28px] lg:text-[36px] font-bold text-[#1a1f2e] cursor-text tracking-wide hover:opacity-80 transition-opacity"
                     onClick={() => openTextEdit('修改名字', homeName, 'homeName', setHomeName)}
                   >{homeName}</div>
                   <div 
                     className="text-[12px] sm:text-[16px] lg:text-[20px] text-gray-400 mt-1 sm:mt-2 cursor-text tracking-wider hover:opacity-80 transition-opacity font-light"
                     onClick={() => openTextEdit('修改ID', homeId, 'homeId', setHomeId)}
                   >{homeId}</div>
                   
                   <div 
                     className="max-w-[80%] text-[13px] sm:text-[16px] lg:text-[22px] text-gray-600 mt-auto mb-4 sm:mb-8 cursor-text font-medium tracking-widest text-center hover:opacity-80 transition-opacity leading-relaxed"
                     onClick={() => openTextEdit('修改签名', homeQuote, 'homeQuote', setHomeQuote)}
                   >{homeQuote}</div>
                   
                   <div 
                     className="flex items-center gap-1 sm:gap-2 lg:gap-3 text-[11px] sm:text-[14px] lg:text-[18px] text-gray-400 cursor-text tracking-wider hover:opacity-80 transition-opacity font-light"
                     onClick={() => openTextEdit('修改位置', homeLocation, 'homeLocation', setHomeLocation)}
                   >
                     <MapPin className="w-[11px] h-[11px] sm:w-[16px] sm:h-[16px] lg:w-[20px] lg:h-[20px]" strokeWidth={2} />
                     <span>{homeLocation}</span>
                   </div>
                </div>
              </div>
            </div>

                  {/* App Grid for Page 1 */}
                  <div className="flex-1 px-4 sm:px-12 md:px-20 lg:px-32 flex flex-col justify-start pt-2 sm:pt-4">
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={(event) => {
                      const { active, over } = event;
                      setActiveId(null);
                      if (over && active.id !== over.id) {
                        setDesktopApps((items: any) => {
                          const oldIndex = items.findIndex((i: any) => i.id === active.id);
                          const newIndex = items.findIndex((i: any) => i.id === over.id);
                          return arrayMove(items, oldIndex, newIndex);
                        });
                      }
                    }}
                  >
                    <div 
                      className="grid grid-cols-4 gap-x-4 sm:gap-x-8 md:gap-x-12 lg:gap-x-20 gap-y-6 sm:gap-y-10 md:gap-y-14 lg:gap-y-16 px-2 sm:px-6 relative"
                      onClick={() => { if (isEditingApps) setIsEditingApps(false); }}
                    >
                      {/* Left: Calendar Widget */}
                      <div className="col-span-2 row-span-2 pointer-events-auto cursor-default group z-20" onClick={(e) => { e.stopPropagation(); if (isEditingApps) setIsEditingApps(false); }}>
                        <CalendarWidget />
                      </div>
                      
                      <SortableContext items={desktopApps.map((i: any) => i.id)} strategy={rectSortingStrategy}>
                        {desktopApps.map((app: any) => (
                          <SortableAppIcon
                            key={app.id}
                            id={app.id}
                            icon={iconMap[app.iconKey]}
                            label={app.label}
                            onClick={() => handleAppClick(app.screen)}
                            isEditing={isEditingApps}
                          />
                        ))}
                      </SortableContext>
                      <DragOverlay>
                        {activeId ? (
                          <div className="flex justify-center scale-110 opacity-80 cursor-grabbing pointer-events-none">
                            <AppIcon
                              icon={iconMap[desktopApps.find((i: any) => i.id === activeId)?.iconKey || '']}
                              label={desktopApps.find((i: any) => i.id === activeId)?.label || ''}
                            />
                          </div>
                        ) : null}
                      </DragOverlay>

                    </div>
                  </DndContext>
                  </div>
                </div>

                {/* Page 2 */}
                <div className="w-full flex-shrink-0 flex flex-col">
                  <div className="flex-1 px-4 sm:px-12 md:mx-20 lg:mx-32 flex flex-col justify-start pt-2 sm:pt-4">
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={(event) => {
                      const { active, over } = event;
                      setActiveId(null);
                      if (over && active.id !== over.id) {
                        setDesktopAppsPage2((items: any) => {
                          const oldIndex = items.findIndex((i: any) => i.id === active.id);
                          const newIndex = items.findIndex((i: any) => i.id === over.id);
                          return arrayMove(items, oldIndex, newIndex);
                        });
                      }
                    }}
                  >
                    <div 
                      className="grid grid-cols-4 gap-x-4 sm:gap-x-8 md:gap-x-12 lg:gap-x-20 gap-y-6 sm:gap-y-10 md:gap-y-14 lg:gap-y-16 px-2 sm:px-6 relative"
                      onClick={() => { if (isEditingApps) setIsEditingApps(false); }}
                    >
                      {/* Left: Profile Card Widget */}
                      <div className="col-span-2 row-span-2 pointer-events-auto cursor-default group z-20" onClick={(e) => { e.stopPropagation(); if (isEditingApps) setIsEditingApps(false); }}>
                        <ProfileCard />
                      </div>

                      <SortableContext items={desktopAppsPage2.map((i: any) => i.id)} strategy={rectSortingStrategy}>
                        {desktopAppsPage2.map((app: any) => (
                          <SortableAppIcon
                            key={app.id}
                            id={app.id}
                            icon={iconMap[app.iconKey]}
                            label={app.label}
                            onClick={() => handleAppClick(app.screen)}
                            isEditing={isEditingApps}
                          />
                        ))}
                      </SortableContext>
                      <DragOverlay>
                        {activeId ? (
                          <div className="flex justify-center scale-110 opacity-80 cursor-grabbing pointer-events-none">
                            <AppIcon
                              icon={iconMap[desktopAppsPage2.find((i: any) => i.id === activeId)?.iconKey || '']}
                              label={desktopAppsPage2.find((i: any) => i.id === activeId)?.label || ''}
                            />
                          </div>
                        ) : null}
                      </DragOverlay>
                    </div>
                  </DndContext>
                  </div>
                </div>
              </div>

              {/* Page Indicators */}
              <div className="flex justify-center gap-2 mt-4 absolute bottom-0 left-0 right-0 pb-2">
                <div className={`w-2 h-2 rounded-full ${currentPage === 0 ? 'bg-gray-800' : 'bg-gray-400'}`} />
                <div className={`w-2 h-2 rounded-full ${currentPage === 1 ? 'bg-gray-800' : 'bg-gray-400'}`} />
              </div>
            </div>
          </div>


          {/* Bottom Dock */}
          <div className="flex-shrink-0 flex flex-col justify-end relative z-20 px-4 sm:px-8 md:px-20 lg:px-32 pb-1 pt-1">
            <div className="px-2 sm:px-5 py-3 sm:py-4 flex justify-around items-center w-full bg-white/20 backdrop-blur-2xl rounded-[32px] sm:rounded-[40px] shadow-[0_8px_32px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_0_20px_rgba(255,255,255,0.1)] border border-white/30 backdrop-saturate-150">
              <AppIcon onClick={() => setCurrentScreen('settings')} icon={<IconSettings />} label="设置" />
              <AppIcon icon={<IconMessage />} label="短信" />
              <AppIcon icon={<IconCompanion />} label="陪伴" />
              <AppIcon onClick={() => setCurrentScreen('theme')} icon={<IconTheme />} label="主题" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
