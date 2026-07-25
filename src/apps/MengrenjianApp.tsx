import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Plus, Search, MoreHorizontal, MessageSquare, MoreVertical, MapPin, ArrowRightLeft, Gift, Image as ImageIcon, Camera, RefreshCcw, Folder, Copy, Trash2, Video, Phone, CloudMoon, Navigation, Shirt, CornerUpLeft, Edit2, LayoutGrid, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCurrentTime } from '../components';

const formatChatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const day = days[date.getDay()];
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? '下午' : '上午';
  const displayHours = hours % 12 || 12;
  return `${day} ${ampm} ${displayHours}:${minutes}`;
};

export const MengrenjianApp = ({ 
  onBack, 
  myProfile, 
  wechatFriends, 
  chats,
  isTyping,
  onSendMessage,
  onTriggerAI,
  onOpenMyProfile,
  onClearChat,
  onEditMessage,
  onDeleteMessages
}: { 
  onBack: () => void; 
  myProfile: any; 
  wechatFriends: any[];
  chats?: Record<string, any[]>;
  isTyping?: Record<string, boolean>;
  onSendMessage?: (friendId: string, text: string, isMe: boolean, msgType: string, recalledContent?: string) => void;
  onTriggerAI?: (friendId: string, isMengrenjian?: boolean) => void;
  onOpenMyProfile: () => void;
  onClearChat?: (friendId: string) => void;
  onEditMessage?: (friendId: string, msgId: number, newText: string) => void;
  onDeleteMessages?: (friendId: string, ids: number[]) => Promise<void>;
}) => {
  const [currentTab, setCurrentTab] = useState<'records' | 'archive' | 'face' | 'me'>('records');
  const [selectedFriend, setSelectedFriend] = useState<any | null>(null);
  const [chattingFriend, setChattingFriend] = useState<any | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState<{dreamIdentity: string; worldview: string; userIdentity: string}>({
    dreamIdentity: '',
    worldview: '',
    userIdentity: ''
  });
  const [settings, setSettings] = useState({
    showMindCard: true,
    onlineMode: true,
    offlineMode: false,
    aiMemoryEnabled: true,
    aiMemoryContextCount: 200,
    aiMemoryAutoSummarize: false,
    aiMemorySummarizeTriggerCount: 50,
    aiMemoryInjectCount: 30
  });
  const [showPluginPanel, setShowPluginPanel] = useState(false);
  const [showFontPanel, setShowFontPanel] = useState(false);
  const [fontSettings, setFontSettings] = useState({
    bubble: { size: 11, color: '#000000' },
    aiNarrator: { size: 11, color: '#2c3e50' },
    userNarrator: { size: 10, color: '#2c3e50' },
    activeDesc: { size: 12, color: '#2c3e50' }
  });
  const [actionMenuMsg, setActionMenuMsg] = useState<any | null>(null);
  const [viewingMindCard, setViewingMindCard] = useState<any | null>(null);
  const [editingMsg, setEditingMsg] = useState<any | null>(null);
  const [editingText, setEditingText] = useState('');
  const [insertModalMsg, setInsertModalMsg] = useState<any | null>(null);
  const [insertMsgType, setInsertMsgType] = useState<'text' | 'narrator'>('text');
  const [insertText, setInsertText] = useState('');
  const [isMultiSelecting, setIsMultiSelecting] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<number[]>([]);
  const [quotedMessage, setQuotedMessage] = useState<any | null>(null);
  const [offlineStartTime, setOfflineStartTime] = useState<number | null>(null);
  const [offlineDuration, setOfflineDuration] = useState<number>(0);
  const [isOfflineExpanded, setIsOfflineExpanded] = useState(false);
  const [isNarratorMode, setIsNarratorMode] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressFiredRef = useRef(false);

  const startLongPress = (msg: any) => {
    longPressFiredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      setActionMenuMsg(msg);
    }, 500);
  };
  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  // 线下模式：加载 offlineStartTime
  useEffect(() => {
    if (chattingFriend) {
      const saved = localStorage.getItem(`dream_offline_${chattingFriend.id}`);
      setOfflineStartTime(saved ? parseInt(saved) : null);
    } else {
      setOfflineStartTime(null);
    }
  }, [chattingFriend]);

  // 线下模式：计时器
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (offlineStartTime) {
      setOfflineDuration(Date.now() - offlineStartTime);
      interval = setInterval(() => {
        setOfflineDuration(Date.now() - offlineStartTime);
      }, 60000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [offlineStartTime]);

  const formatDuration = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000);
    if (totalMinutes < 60) return `${totalMinutes} 分钟`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours < 24) return `${hours} 小时 ${minutes} 分钟`;
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    return `${days} 天 ${remainHours} 小时`;
  };

  const currentTime = useCurrentTime();
  const timeString = typeof currentTime === 'string' ? currentTime : new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  const renderContent = () => {
    switch (currentTab) {
      case 'records':
        // 获取有聊天记录的朋友列表
        const friendsWithChats = wechatFriends.filter(friend => 
          chats && chats[friend.id] && chats[friend.id].length > 0
        );

        return (
          <>
            {/* 分类标签 */}
            <div className="px-4 pb-3 flex justify-between gap-2 z-10">
              <button className="flex-1 bg-white/90 backdrop-blur-sm rounded-[16px] py-3 flex justify-center items-center gap-2 border border-pink-50 shadow-sm text-[13px] text-gray-600">
                <span className="text-pink-300">🌸</span> 좋아해요
              </button>
              <button className="flex-1 bg-white/90 backdrop-blur-sm rounded-[16px] py-3 flex justify-center items-center gap-2 border border-pink-50 shadow-sm text-[13px] text-gray-600">
                ^υ^
              </button>
              <button className="flex-1 bg-white/90 backdrop-blur-sm rounded-[16px] py-3 flex justify-center items-center gap-2 border border-pink-50 shadow-sm text-[13px] text-gray-600">
                <span className="text-gray-400">♡</span>ㅎㅇ..
              </button>
            </div>

            {/* 聊天列表 */}
            <div className="flex-1 overflow-y-auto relative z-0 px-4">
              <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-[-1]"></div>
              
              {friendsWithChats.length > 0 ? (
                <>
                  {friendsWithChats.map((friend: any) => {
                    const friendMessages = chats[friend.id] || [];
                    const lastMsg = friendMessages[friendMessages.length - 1];
                    const lastMsgText = lastMsg?.msgType === 'system' 
                      ? lastMsg.text 
                      : lastMsg?.msgType === 'narrator'
                      ? `[旁白] ${lastMsg.text.slice(0, 20)}${lastMsg.text.length > 20 ? '...' : ''}`
                      : lastMsg?.text?.slice(0, 30) + (lastMsg?.text?.length > 30 ? '...' : '');
                    
                    return (
                      <div 
                        key={friend.id}
                        className="bg-white/80 backdrop-blur-md rounded-3xl p-3 flex items-center gap-3 mb-3 border border-pink-50 shadow-[0_2px_10px_rgba(255,192,203,0.15)] cursor-pointer active:scale-[0.98] transition-transform"
                        onClick={() => setChattingFriend(friend)}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center shadow-inner overflow-hidden border-2 border-white shrink-0">
                          {friend.avatar ? (
                            <img src={friend.avatar} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl">{friend.emoji || '🧸'}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium text-gray-800 text-[15px] truncate">{friend.wechat_remark || friend.name || '未知朋友'}</h3>
                            <span className="text-[11px] text-gray-400 shrink-0 ml-2">
                              {lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'}) : ''}
                            </span>
                          </div>
                          <p className="text-[12px] text-gray-500 truncate">{lastMsgText || '开始聊天...'}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div className="pb-24"></div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-300">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-50">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <p className="text-sm">暂无聊天记录</p>
                  </div>
                </div>
              )}
            </div>
          </>
        );
      case 'archive':
        return (
          <div className="flex-1 overflow-y-auto relative z-0 px-4 pt-2">
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-[-1]"></div>
            
            <div className="text-[13px] text-gray-500 font-medium mb-3 ml-2">特别关心</div>
            
            {/* 档案列表项 */}
            {wechatFriends.length > 0 ? (
              wechatFriends.map((friend: any, index: number) => (
                <div 
                  key={friend.id || index} 
                  className="bg-white/80 backdrop-blur-md rounded-3xl p-3 flex items-center gap-4 mb-3 border border-pink-50 shadow-[0_2px_10px_rgba(255,192,203,0.15)] relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => setSelectedFriend(friend)}
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center shadow-inner overflow-hidden border-2 border-white">
                    {friend.avatar ? (
                      <img src={friend.avatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">{friend.emoji || '🧸'}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800 text-[15px]">{friend.wechat_remark || friend.name || '未知朋友'}</h3>
                    <p className="text-[12px] text-gray-500 mt-0.5 tracking-wide line-clamp-1">{friend.signature || '暂无签名'}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-pink-400">
                    <ChevronLeft size={16} className="rotate-180" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                暂无档案
              </div>
            )}
            
            <div className="pb-24"></div>
          </div>
        );
      case 'me':
        return (
          <div className="flex-1 overflow-y-auto relative z-0 px-4 pt-4">
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-[-1]"></div>
            
            {/* 学生档案卡片 */}
            <div className="bg-white/90 backdrop-blur-xl rounded-[32px] p-6 border border-pink-100 shadow-[0_8px_32px_rgba(255,182,193,0.25)] relative overflow-hidden mb-6">
              {/* 卡片装饰 */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-100/50 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-100/50 rounded-full blur-xl translate-y-1/2 -translate-x-1/2"></div>
              
              <div className="flex items-start justify-between relative z-10">
                <div className="flex-1">
                  <div className="inline-block px-3 py-1 bg-pink-50 text-pink-500 rounded-full text-[10px] font-bold tracking-widest mb-3 border border-pink-100">STUDENT PROFILE</div>
                  <h2 className="text-2xl font-bold text-gray-800 tracking-wider">{myProfile.name || '我'}</h2>
                  <p className="text-[13px] text-gray-500 mt-1 tracking-widest">NO. 202309104</p>
                </div>
                
                <div className="w-20 h-24 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-100 shadow-inner flex flex-col items-center justify-center border-4 border-white rotate-2 hover:rotate-0 transition-transform overflow-hidden">
                  {myProfile.avatar ? (
                    <img src={myProfile.avatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl mb-1">👧🏻</span>
                  )}
                </div>
              </div>
              
              <div className="mt-6 space-y-3 relative z-10">
                <div className="flex items-center">
                  <div className="w-16 text-[12px] text-gray-400 tracking-widest">身份</div>
                  <div className="flex-1 text-[14px] text-gray-700 font-medium">{myProfile.identity || '未设置身份'}</div>
                </div>
                <div className="flex items-center">
                  <div className="w-16 text-[12px] text-gray-400 tracking-widest">年龄</div>
                  <div className="flex-1 text-[14px] text-gray-700 font-medium">{myProfile.age ? `${myProfile.age}岁` : '未设置年龄'}</div>
                </div>
              </div>
            </div>

            {/* 设置项 */}
            <div className="bg-white/80 backdrop-blur-md rounded-[24px] p-2 border border-pink-50 shadow-sm mb-24">
              <button 
                onClick={onOpenMyProfile}
                className="w-full flex items-center justify-between p-3 rounded-2xl active:bg-pink-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center text-pink-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  </div>
                  <span className="text-[14px] text-gray-700 font-medium">编辑档案</span>
                </div>
                <ChevronLeft size={16} className="text-gray-300 rotate-180" />
              </button>
              
              <div className="h-[1px] bg-gray-100 mx-4 my-1"></div>
              
              <button className="w-full flex items-center justify-between p-3 rounded-2xl active:bg-pink-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <span className="text-[14px] text-gray-700 font-medium">隐私设置</span>
                </div>
                <ChevronLeft size={16} className="text-gray-300 rotate-180" />
              </button>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex-1 overflow-y-auto flex items-center justify-center relative z-0">
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px]"></div>
            <div className="text-center text-gray-400 text-sm tracking-widest">
              正在开发中...
            </div>
          </div>
        );
    }
  };

  if (chattingFriend) {
    const friendChats = (chats && chats[chattingFriend.id]) || [];
    const isFriendTyping = isTyping && isTyping[chattingFriend.id];
    return (
      <div className="fixed inset-0 bg-[#f5f0f1] z-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* 聊天 Header */}
        <div className="bg-transparent px-4 pt-12 pb-2 relative z-20 flex items-center justify-between">
          <button 
            onClick={() => setChattingFriend(null)}
            className="w-8 h-8 flex items-center justify-start active:opacity-50"
          >
            <ChevronLeft size={28} className="text-gray-800" strokeWidth={2.5} />
          </button>
          
          {/* 中间信息卡片 */}
          <div 
            className="flex-1 mx-2 bg-gradient-to-r from-pink-50/90 to-pink-100/60 backdrop-blur-md rounded-[30px] flex items-center p-1.5 shadow-[0_2px_10px_rgba(255,182,193,0.1)] active:scale-[0.98] transition-transform cursor-pointer"
            onClick={() => {
              // 打开弹窗前，从 localStorage 加载已保存的设定
              const saved = localStorage.getItem(`dream_profile_${chattingFriend.id}`);
              if (saved) {
                try { setProfileData(JSON.parse(saved)); } catch(e) {}
              } else {
                setProfileData({ dreamIdentity: '', worldview: '', userIdentity: '' });
              }
              setShowProfileModal(true);
            }}
          >
            <div className="w-[42px] h-[42px] rounded-full overflow-hidden shrink-0 border border-white/60 shadow-sm">
              {chattingFriend.avatar ? (
                <img src={chattingFriend.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white flex items-center justify-center text-xl">{chattingFriend.emoji || '🧸'}</div>
              )}
            </div>
            <div className="ml-3 flex flex-col justify-center overflow-hidden flex-1 py-0.5 pr-2">
              <div className="text-[10px] text-[#e08696] font-medium tracking-wide">Stay With You</div>
              <div className="flex items-center gap-1">
                <div className="text-[13px] text-gray-800 font-bold truncate leading-tight my-0.5">{chattingFriend.wechat_remark || chattingFriend.name}</div>
                {isFriendTyping && <span className="text-[#e08696] text-[10px] animate-pulse">输入中...</span>}
              </div>
              <div className="text-[9px] text-[#d6858e] truncate font-light tracking-wide">
                "{chattingFriend.signature || '我的心已经等你好多年，爱不发觉自己快老去...'}"
              </div>
            </div>
          </div>

          <button 
            className="w-8 h-8 flex items-center justify-end active:opacity-50"
            onClick={() => setShowSettings(true)}
          >
            <MoreVertical size={24} className="text-gray-800" strokeWidth={2.5} />
          </button>
        </div>

        {/* 入梦资料设定弹窗 */}
        {showProfileModal && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center animate-in fade-in duration-200">
            {/* 遮罩层 */}
            <div 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowProfileModal(false)}
            ></div>
            
            {/* 弹窗内容 */}
            <div className="relative w-[85%] max-w-[320px] bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">入梦设定</h3>
                <p className="text-xs text-gray-500 mt-1">设定你们之间的角色与背景</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">对方入梦身份</label>
                  <input 
                    type="text"
                    placeholder="如：冷酷总裁、温柔学长..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:bg-white transition-all"
                    value={profileData.dreamIdentity}
                    onChange={(e) => setProfileData(prev => ({...prev, dreamIdentity: e.target.value}))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">世界观</label>
                  <textarea 
                    placeholder="如：现代都市、修仙界、星际未来..."
                    rows={3}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:bg-white transition-all resize-none"
                    value={profileData.worldview}
                    onChange={(e) => setProfileData(prev => ({...prev, worldview: e.target.value}))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">用户身份</label>
                  <input 
                    type="text"
                    placeholder="你的身份设定..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:bg-white transition-all"
                    value={profileData.userIdentity}
                    onChange={(e) => setProfileData(prev => ({...prev, userIdentity: e.target.value}))}
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  className="flex-1 py-2.5 rounded-xl text-gray-500 bg-gray-100 font-medium active:bg-gray-200 transition-colors"
                  onClick={() => setShowProfileModal(false)}
                >
                  取消
                </button>
                <button 
                  className="flex-1 py-2.5 rounded-xl text-white bg-pink-400 font-medium active:bg-pink-500 shadow-md shadow-pink-200 transition-colors"
                  onClick={() => {
                    // 保存入梦设定到 localStorage，以 friendId 为 key
                    localStorage.setItem(`dream_profile_${chattingFriend.id}`, JSON.stringify(profileData));
                    setShowProfileModal(false);
                  }}
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 设置面板 */}
        {showSettings && (
          <div className="absolute inset-0 bg-[#f5f0f1] z-50 flex flex-col animate-in slide-in-from-bottom-2 duration-200">
            <div className="bg-white/80 backdrop-blur-md px-4 pt-12 pb-3 relative flex items-center justify-between border-b border-pink-100/50">
              <button 
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 flex items-center justify-start active:opacity-50"
              >
                <ChevronLeft size={24} className="text-gray-800" strokeWidth={2.5} />
              </button>
              <div className="text-[17px] font-medium text-gray-800 tracking-wider">聊天设置</div>
              <div className="w-8"></div>
            </div>

            <div className="flex-1 overflow-y-auto pt-4 space-y-4 px-4 pb-12">
              <div className="bg-white rounded-[20px] overflow-hidden shadow-sm border border-pink-50/50">
                {/* Cher心声开关 */}
                <div className="flex items-center justify-between p-4 border-b border-gray-50">
                  <div>
                    <div className="text-[15px] text-gray-800 font-medium">Cher心声开关</div>
                    <div className="text-[12px] text-gray-400 mt-1">显示对方内心的真实想法</div>
                  </div>
                  <button 
                    className={`w-12 h-6 rounded-full transition-colors relative ${settings.showMindCard ? 'bg-pink-300' : 'bg-gray-200'}`}
                    onClick={() => setSettings(prev => ({...prev, showMindCard: !prev.showMindCard}))}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${settings.showMindCard ? 'translate-x-6' : 'translate-x-1'}`}></div>
                  </button>
                </div>

                {/* 线上模式设置 */}
                <div className="flex items-center justify-between p-4 border-b border-gray-50">
                  <div>
                    <div className="text-[15px] text-gray-800 font-medium">线上模式设置</div>
                    <div className="text-[12px] text-gray-400 mt-1">允许AI实时回复消息</div>
                  </div>
                  <button 
                    className={`w-12 h-6 rounded-full transition-colors relative ${settings.onlineMode ? 'bg-pink-300' : 'bg-gray-200'}`}
                    onClick={() => setSettings(prev => ({...prev, onlineMode: !prev.onlineMode}))}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${settings.onlineMode ? 'translate-x-6' : 'translate-x-1'}`}></div>
                  </button>
                </div>

                {/* AI记忆设置面板 */}
                <div className="p-4 border-b border-gray-50 bg-gray-50/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-[15px] text-gray-800 font-medium flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12L2.1 7.1"/></svg>
                      AI 记忆设置
                    </div>
                    <button 
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.aiMemoryEnabled ? 'bg-pink-300' : 'bg-gray-200'}`}
                      onClick={() => setSettings(prev => ({...prev, aiMemoryEnabled: !prev.aiMemoryEnabled}))}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${settings.aiMemoryEnabled ? 'translate-x-6' : 'translate-x-1'}`}></div>
                    </button>
                  </div>
                  
                  {settings.aiMemoryEnabled && (
                    <div className="space-y-5 mt-2 animate-in fade-in duration-200">
                      {/* 上下文记忆条数 */}
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] text-gray-600">上下文记忆条数</span>
                        <div className="bg-white border border-gray-200 rounded-lg px-3 py-1 w-20 flex items-center justify-center shadow-sm">
                          <input 
                            type="number" 
                            className="w-full text-center text-[14px] text-gray-700 focus:outline-none bg-transparent"
                            value={settings.aiMemoryContextCount}
                            onChange={(e) => setSettings(prev => ({...prev, aiMemoryContextCount: Number(e.target.value)}))}
                          />
                        </div>
                      </div>

                      {/* 自动总结 */}
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] text-gray-600">自动总结</span>
                        <button 
                          className={`w-12 h-6 rounded-full transition-colors relative ${settings.aiMemoryAutoSummarize ? 'bg-pink-300' : 'bg-gray-200'}`}
                          onClick={() => setSettings(prev => ({...prev, aiMemoryAutoSummarize: !prev.aiMemoryAutoSummarize}))}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${settings.aiMemoryAutoSummarize ? 'translate-x-6' : 'translate-x-1'}`}></div>
                        </button>
                      </div>

                      {/* 自动总结触发条数 */}
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] text-gray-600">自动总结触发条数</span>
                        <div className="bg-white border border-gray-200 rounded-lg px-3 py-1 w-20 flex items-center justify-center shadow-sm">
                          <input 
                            type="number" 
                            className="w-full text-center text-[14px] text-gray-700 focus:outline-none bg-transparent"
                            value={settings.aiMemorySummarizeTriggerCount}
                            onChange={(e) => setSettings(prev => ({...prev, aiMemorySummarizeTriggerCount: Number(e.target.value)}))}
                          />
                        </div>
                      </div>

                      {/* 总结状态与操作 */}
                      <div className="pt-2 border-t border-gray-100/50">
                        <div className="text-[12px] text-gray-400 mb-3">已总结 0 条 / 共 {chats?.[chattingFriend?.id]?.length || 0} 条，待总结 {chats?.[chattingFriend?.id]?.length || 0} 条</div>
                        <div className="flex gap-3">
                          <button className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl text-[13px] font-medium active:bg-gray-200 transition-colors">
                            总结下一批
                          </button>
                          <button className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl text-[13px] font-medium active:bg-gray-200 transition-colors">
                            全部总结
                          </button>
                        </div>
                      </div>

                      {/* 记忆注入数量 */}
                      <div className="pt-3 border-t border-gray-100/50">
                        <div className="text-[14px] text-gray-600 mb-3">记忆注入数量</div>
                        <div className="flex gap-2">
                          {[15, 30, 50, 'custom'].map((val) => (
                            <button 
                              key={val}
                              className={`flex-1 py-2 rounded-lg text-[14px] border transition-colors ${
                                (val === 'custom' && ![15, 30, 50].includes(settings.aiMemoryInjectCount)) || settings.aiMemoryInjectCount === val
                                  ? 'border-gray-800 text-gray-800 bg-white font-medium shadow-sm' 
                                  : 'border-gray-200 text-blue-500 bg-white hover:bg-gray-50'
                              }`}
                              onClick={() => {
                                if (val !== 'custom') {
                                  setSettings(prev => ({...prev, aiMemoryInjectCount: val as number}));
                                }
                              }}
                            >
                              {val === 'custom' ? (
                                ![15, 30, 50].includes(settings.aiMemoryInjectCount) ? settings.aiMemoryInjectCount : '30' // Fallback for custom display
                              ) : val}
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-between mt-4">
                          <span className="text-[12px] text-gray-400">当前消息总数: {chats?.[chattingFriend?.id]?.length || 0}</span>
                          <span className="text-[12px] text-gray-400">当前消耗 Token: ~{((chats?.[chattingFriend?.id]?.length || 0) * 15.5).toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 线下模式设置 */}
                <div className="flex items-center justify-between p-4">
                  <div>
                    <div className="text-[15px] text-gray-800 font-medium">线下模式设置</div>
                    <div className="text-[12px] text-gray-400 mt-1">仅在本地保存，不连接网络</div>
                  </div>
                  <button 
                    className={`w-12 h-6 rounded-full transition-colors relative ${settings.offlineMode ? 'bg-pink-300' : 'bg-gray-200'}`}
                    onClick={() => setSettings(prev => ({...prev, offlineMode: !prev.offlineMode}))}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${settings.offlineMode ? 'translate-x-6' : 'translate-x-1'}`}></div>
                  </button>
                </div>
              </div>

              {/* 字体与颜色 */}
              <div className="bg-white rounded-[20px] overflow-hidden shadow-sm border border-pink-50/50">
                <button 
                  className="w-full flex items-center justify-between p-4 active:bg-gray-50"
                  onClick={() => setShowFontPanel(!showFontPanel)}
                >
                  <div className="text-[15px] text-gray-800 font-medium">字体与颜色</div>
                  <ChevronLeft size={20} className={`text-gray-400 transition-transform ${showFontPanel ? 'rotate-90' : 'rotate-180'}`} />
                </button>

                {showFontPanel && (
                  <div className="px-4 pb-5 space-y-6 animate-in fade-in duration-200 border-t border-gray-50">
                    {/* 气泡消息 */}
                    <div className="pt-4">
                      <div className="text-[15px] text-gray-800 font-bold mb-3">气泡消息</div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[13px] text-gray-500 w-8">字号</span>
                        <span className="text-[12px] text-gray-400">小</span>
                        <input 
                          type="range" min="8" max="20" step="1"
                          value={fontSettings.bubble.size}
                          onChange={(e) => setFontSettings(prev => ({...prev, bubble: {...prev.bubble, size: Number(e.target.value)}}))}
                          className="flex-1 h-1 accent-gray-700"
                        />
                        <span className="text-[12px] text-gray-400">大</span>
                        <span className="text-[13px] text-gray-600 font-medium w-10 text-right">{fontSettings.bubble.size}px</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] text-gray-500 w-8">颜色</span>
                        <input 
                          type="color" 
                          value={fontSettings.bubble.color}
                          onChange={(e) => setFontSettings(prev => ({...prev, bubble: {...prev.bubble, color: e.target.value}}))}
                          className="w-7 h-7 rounded-md border border-gray-200 cursor-pointer"
                        />
                        <span className="text-[13px] text-gray-500">{fontSettings.bubble.color === '#000000' ? '#默认' : fontSettings.bubble.color}</span>
                        <div className="flex-1"></div>
                        <button 
                          className="text-[12px] text-gray-500 border border-gray-200 rounded-md px-3 py-1 active:bg-gray-100"
                          onClick={() => setFontSettings(prev => ({...prev, bubble: {size: 11, color: '#000000'}}))}
                        >
                          重置
                        </button>
                      </div>
                    </div>

                    {/* AI旁白 */}
                    <div className="pt-2 border-t border-gray-100">
                      <div className="text-[15px] text-gray-800 font-bold mb-3">AI旁白</div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[13px] text-gray-500 w-8">字号</span>
                        <span className="text-[12px] text-gray-400">小</span>
                        <input 
                          type="range" min="8" max="20" step="1"
                          value={fontSettings.aiNarrator.size}
                          onChange={(e) => setFontSettings(prev => ({...prev, aiNarrator: {...prev.aiNarrator, size: Number(e.target.value)}}))}
                          className="flex-1 h-1 accent-gray-700"
                        />
                        <span className="text-[12px] text-gray-400">大</span>
                        <span className="text-[13px] text-gray-600 font-medium w-10 text-right">{fontSettings.aiNarrator.size}px</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] text-gray-500 w-8">颜色</span>
                        <input 
                          type="color" 
                          value={fontSettings.aiNarrator.color}
                          onChange={(e) => setFontSettings(prev => ({...prev, aiNarrator: {...prev.aiNarrator, color: e.target.value}}))}
                          className="w-7 h-7 rounded-md border border-gray-200 cursor-pointer"
                        />
                        <span className="text-[13px] text-gray-500">{fontSettings.aiNarrator.color === '#2c3e50' ? '#默认' : fontSettings.aiNarrator.color}</span>
                        <div className="flex-1"></div>
                        <button 
                          className="text-[12px] text-gray-500 border border-gray-200 rounded-md px-3 py-1 active:bg-gray-100"
                          onClick={() => setFontSettings(prev => ({...prev, aiNarrator: {size: 11, color: '#2c3e50'}}))}
                        >
                          重置
                        </button>
                      </div>
                    </div>

                    {/* 用户旁白 */}
                    <div className="pt-2 border-t border-gray-100">
                      <div className="text-[15px] text-gray-800 font-bold mb-3">用户旁白</div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[13px] text-gray-500 w-8">字号</span>
                        <span className="text-[12px] text-gray-400">小</span>
                        <input 
                          type="range" min="8" max="20" step="1"
                          value={fontSettings.userNarrator.size}
                          onChange={(e) => setFontSettings(prev => ({...prev, userNarrator: {...prev.userNarrator, size: Number(e.target.value)}}))}
                          className="flex-1 h-1 accent-gray-700"
                        />
                        <span className="text-[12px] text-gray-400">大</span>
                        <span className="text-[13px] text-gray-600 font-medium w-10 text-right">{fontSettings.userNarrator.size}px</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] text-gray-500 w-8">颜色</span>
                        <input 
                          type="color" 
                          value={fontSettings.userNarrator.color}
                          onChange={(e) => setFontSettings(prev => ({...prev, userNarrator: {...prev.userNarrator, color: e.target.value}}))}
                          className="w-7 h-7 rounded-md border border-gray-200 cursor-pointer"
                        />
                        <span className="text-[13px] text-gray-500">{fontSettings.userNarrator.color === '#2c3e50' ? '#默认' : fontSettings.userNarrator.color}</span>
                        <div className="flex-1"></div>
                        <button 
                          className="text-[12px] text-gray-500 border border-gray-200 rounded-md px-3 py-1 active:bg-gray-100"
                          onClick={() => setFontSettings(prev => ({...prev, userNarrator: {size: 10, color: '#2c3e50'}}))}
                        >
                          重置
                        </button>
                      </div>
                    </div>

                    {/* 主动消息描述 */}
                    <div className="pt-2 border-t border-gray-100">
                      <div className="text-[15px] text-gray-800 font-bold mb-3">主动消息描述</div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[13px] text-gray-500 w-8">字号</span>
                        <span className="text-[12px] text-gray-400">小</span>
                        <input 
                          type="range" min="8" max="20" step="1"
                          value={fontSettings.activeDesc.size}
                          onChange={(e) => setFontSettings(prev => ({...prev, activeDesc: {...prev.activeDesc, size: Number(e.target.value)}}))}
                          className="flex-1 h-1 accent-gray-700"
                        />
                        <span className="text-[12px] text-gray-400">大</span>
                        <span className="text-[13px] text-gray-600 font-medium w-10 text-right">{fontSettings.activeDesc.size}px</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] text-gray-500 w-8">颜色</span>
                        <input 
                          type="color" 
                          value={fontSettings.activeDesc.color}
                          onChange={(e) => setFontSettings(prev => ({...prev, activeDesc: {...prev.activeDesc, color: e.target.value}}))}
                          className="w-7 h-7 rounded-md border border-gray-200 cursor-pointer"
                        />
                        <span className="text-[13px] text-gray-500">{fontSettings.activeDesc.color === '#2c3e50' ? '#默认' : fontSettings.activeDesc.color}</span>
                        <div className="flex-1"></div>
                        <button 
                          className="text-[12px] text-gray-500 border border-gray-200 rounded-md px-3 py-1 active:bg-gray-100"
                          onClick={() => setFontSettings(prev => ({...prev, activeDesc: {size: 12, color: '#2c3e50'}}))}
                        >
                          重置
                        </button>
                      </div>
                    </div>

                    {/* 预览区域 */}
                    <div className="pt-4 border-t border-gray-100">
                      <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-[12px] text-gray-400 w-14 shrink-0">气泡</span>
                          <div className="bg-[#e5b5b9] text-white rounded-2xl rounded-tr-md px-3 py-1.5">
                            <span style={{ fontSize: `${fontSettings.bubble.size}px`, color: fontSettings.bubble.color === '#000000' ? '#fff' : fontSettings.bubble.color }}>你好，这是气泡消息预览</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[12px] text-gray-400 w-14 shrink-0">AI旁白</span>
                          <span style={{ fontSize: `${fontSettings.aiNarrator.size}px`, color: fontSettings.aiNarrator.color }} className="italic">这是AI旁白预览文字</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[12px] text-gray-400 w-14 shrink-0">用户旁白</span>
                          <span style={{ fontSize: `${fontSettings.userNarrator.size}px`, color: fontSettings.userNarrator.color }} className="italic">这是用户旁白预览文字</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[12px] text-gray-400 w-14 shrink-0">主动消息</span>
                          <span style={{ fontSize: `${fontSettings.activeDesc.size}px`, color: fontSettings.activeDesc.color }}>这是主动消息描述预览</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 遗忘这段记忆 */}
              <div className="mt-8 pt-4">
                <button 
                  className="w-full bg-white rounded-[20px] p-4 text-[#ff4d4f] text-[15px] font-medium shadow-sm border border-red-50 active:bg-red-50 transition-colors"
                  onClick={() => {
                    if (window.confirm('确认要遗忘所有与Ta的记录与心声吗？此操作不可逆。')) {
                      if (onClearChat) {
                        onClearChat(chattingFriend.id);
                      }
                      setChattingFriend(null);
                      setShowSettings(false);
                    }
                  }}
                >
                  遗忘这段记忆
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 线下模式卡片（可展开/收起） */}
        {offlineStartTime && (
          <div className="w-full shrink-0 relative z-30">
            <AnimatePresence mode="wait">
              {isOfflineExpanded ? (
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-2 left-1/2 -translate-x-1/2 w-[92%] bg-white/95 backdrop-blur-md rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-pink-100 p-5 flex flex-col items-center gap-1 cursor-pointer"
                  onClick={() => setIsOfflineExpanded(false)}
                >
                  <div className="flex justify-between items-center w-full px-2 mt-1">
                    <div className="flex flex-col items-center">
                      <div className="w-[52px] h-[52px] bg-pink-50 rounded-[14px] flex items-center justify-center overflow-hidden shrink-0 border-2 border-white">
                        {chattingFriend.avatar 
                          ? <img src={chattingFriend.avatar} alt="avatar" className="w-full h-full object-cover" />
                          : <span className="text-2xl">{chattingFriend.emoji || '🧸'}</span>
                        }
                      </div>
                      <span className="text-[13px] text-gray-700 mt-2 font-medium">{chattingFriend.wechat_remark || chattingFriend.name}</span>
                    </div>

                    <div className="flex items-center gap-3 flex-1 justify-center px-4 -mt-6">
                      <div className="h-[2px] flex-1 border-t-[2.5px] border-dashed border-pink-200"></div>
                      <span className="text-[12px] bg-pink-50 text-[#e87a90] px-3 py-[3px] rounded-full font-medium shadow-sm border border-pink-100">见面中</span>
                      <div className="h-[2px] flex-1 border-t-[2.5px] border-dashed border-pink-200"></div>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-[52px] h-[52px] bg-pink-50 rounded-[14px] flex items-center justify-center overflow-hidden shrink-0 border-2 border-white">
                        {myProfile.avatar 
                          ? <img src={myProfile.avatar} alt="my avatar" className="w-full h-full object-cover" />
                          : <span className="text-2xl">👧🏻</span>
                        }
                      </div>
                      <span className="text-[13px] text-gray-700 mt-2 font-medium">我</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-1.5 text-[15px] font-medium text-gray-900 tracking-wide">
                    <MapPin size={16} className="text-[#e87a90] fill-pink-100" strokeWidth={2.5}/>
                    <span>线下见面</span>
                  </div>

                  <div className="mt-[2px] flex items-center gap-1.5 text-[14px] text-gray-400 mb-2">
                    <span>⏱️</span>
                    <span>已见面 {formatDuration(offlineDuration)}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOfflineStartTime(null);
                      setIsOfflineExpanded(false);
                      localStorage.removeItem(`dream_offline_${chattingFriend.id}`);
                      if (onSendMessage) onSendMessage(chattingFriend.id, '「你们结束了线下见面」', true, 'system');
                    }}
                    className="mt-3 w-full bg-pink-50 text-[#e87a90] py-3 rounded-[12px] text-[16px] font-medium active:bg-pink-100 transition-colors border border-pink-100"
                  >
                    结束线下见面
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="collapsed"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full bg-gradient-to-r from-pink-50/80 to-rose-50/80 flex items-center justify-center cursor-pointer overflow-hidden border-b border-pink-100/50"
                  onClick={() => setIsOfflineExpanded(true)}
                >
                  <div className="py-[10px] flex items-center gap-1.5 text-[13px] text-gray-600 font-medium tracking-wide">
                    <MapPin size={15} className="text-[#e87a90] fill-pink-100" strokeWidth={2}/>
                    <span>线下见面中 · {formatDuration(offlineDuration)}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* 多选模式顶栏 */}
        {isMultiSelecting && (
          <div className="bg-white/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-pink-100/50 z-30">
            <button onClick={() => { setIsMultiSelecting(false); setSelectedMsgIds([]); }} className="text-[15px] text-gray-600 active:opacity-50">取消</button>
            <span className="text-[14px] text-gray-700 font-medium">已选 {selectedMsgIds.length} 条</span>
            <div className="w-10"></div>
          </div>
        )}

        {/* 聊天内容区 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {friendChats.map((msg: any, idx: number) => {
            const isSystem = msg.msgType === 'system';
            const isNarrator = msg.msgType === 'narrator';
            const isImage = msg.msgType === 'image';
            const isSticker = msg.msgType === 'sticker';
            const showTime = idx === 0 || (msg.timestamp - friendChats[idx-1].timestamp > 5 * 60 * 1000);
            const isSelected = selectedMsgIds.includes(msg.id);
            
            // 多选模式下点击切换选择
            const toggleSelect = () => {
              if (!isMultiSelecting) return;
              setSelectedMsgIds(prev => prev.includes(msg.id) ? prev.filter(id => id !== msg.id) : [...prev, msg.id]);
            };
            
            // 系统消息
            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-3">
                  <span className="text-[11px] text-gray-400 bg-white/60 px-3 py-1 rounded-full">{msg.text}</span>
                </div>
              );
            }

            // 解析 [MIND_CARD] 标签
            let extractedMindCard = msg.mindCard || null;
            let cleanText = msg.text || '';
            const mindCardRegex = /\[MIND_CARD\]([\s\S]*?)\[\/MIND_CARD\]/;
            const mindCardMatch = cleanText.match(mindCardRegex);
            if (mindCardMatch) {
              cleanText = cleanText.replace(mindCardRegex, '').trim();
              if (!extractedMindCard) {
                const lines = mindCardMatch[1].split('\n');
                extractedMindCard = {};
                lines.forEach((line: string) => {
                  if (line.includes('：')) {
                    const [k, ...v] = line.split('：');
                    const keyStr = k.trim();
                    const valStr = v.join('：').trim();
                    if (keyStr === '着装') extractedMindCard.attire = valStr;
                    else if (keyStr === '动作' || keyStr === '行为') extractedMindCard.action = valStr;
                    else if (keyStr === '心思' || keyStr === '真实心声' || keyStr === '心声') extractedMindCard.thought = valStr;
                    else if (keyStr === '阴暗面') extractedMindCard.dark_side = valStr;
                  } else if (line.includes(':')) {
                    const [k, ...v] = line.split(':');
                    const keyStr = k.trim();
                    const valStr = v.join(':').trim();
                    if (keyStr === '着装') extractedMindCard.attire = valStr;
                    else if (keyStr === '动作' || keyStr === '行为') extractedMindCard.action = valStr;
                    else if (keyStr === '心思' || keyStr === '真实心声' || keyStr === '心声') extractedMindCard.thought = valStr;
                    else if (keyStr === '阴暗面') extractedMindCard.dark_side = valStr;
                  }
                });
              }
            }
            // 清除 [LOCATION:...] 标记
            cleanText = cleanText.replace(/\[LOCATION:.*?\]/g, '').trim();

            // 旁白消息
            if (isNarrator) {
              const hasMindCard = !msg.isMe && extractedMindCard && settings.showMindCard;
              return (
                <div key={msg.id} className="flex items-center justify-center my-3 gap-2" onClick={isMultiSelecting ? toggleSelect : undefined}>
                  {isMultiSelecting && (
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-[#e87a90] border-[#e87a90]' : 'border-gray-300 bg-white'}`}>
                      {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                  )}
                  <div 
                    className="bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-2.5 max-w-[80%] border border-pink-50 shadow-sm relative cursor-pointer"
                    onClick={(e) => { if (isMultiSelecting) return; if (longPressFiredRef.current) return; if (hasMindCard) setViewingMindCard(extractedMindCard); }}
                    onPointerDown={() => { if (!isMultiSelecting) startLongPress(msg); }}
                    onPointerUp={() => { if (!isMultiSelecting) cancelLongPress(); }}
                    onPointerLeave={() => { if (!isMultiSelecting) cancelLongPress(); }}
                    onPointerCancel={() => { if (!isMultiSelecting) cancelLongPress(); }}
                    onTouchMove={() => { if (!isMultiSelecting) cancelLongPress(); }}
                    onContextMenu={(e) => { if (!isMultiSelecting) { e.preventDefault(); setActionMenuMsg(msg); } }}
                  >
                    {hasMindCard && (
                      <div className="absolute top-1 -right-1 w-2.5 h-2.5 bg-pink-400 rounded-full shadow-[0_0_0_1.5px_transparent] z-10" />
                    )}
                    <div className="text-[12px] text-gray-500 italic leading-relaxed text-center whitespace-pre-wrap">{cleanText}</div>
                  </div>
                </div>
              );
            }

            // 如果清理后没有文本且没有mindCard，跳过
            if (!cleanText && !extractedMindCard && !isImage && !isSticker) return null;
            
            return (
              <div key={msg.id} className="flex flex-col" onClick={isMultiSelecting ? toggleSelect : undefined}>
                {showTime && (
                  <div className="flex justify-center mb-5 mt-2">
                    <span className="text-gray-500 text-[11px] font-medium tracking-wider">
                      {formatChatTime(msg.timestamp)}
                    </span>
                  </div>
                )}
                
                <div className={`flex w-full items-center gap-2 ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                  {isMultiSelecting && (
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-[#e87a90] border-[#e87a90]' : 'border-gray-300 bg-white'}`}>
                      {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                  )}
                  <div className={`relative max-w-[75%] group ${msg.isMe ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>

                    {/* 图片消息 */}
                    {isImage ? (
                      <div 
                        className="rounded-2xl overflow-hidden shadow-sm max-w-[220px] cursor-pointer"
                        onPointerDown={() => startLongPress(msg)}
                        onPointerUp={cancelLongPress}
                        onPointerLeave={cancelLongPress}
                        onPointerCancel={cancelLongPress}
                        onContextMenu={(e) => { e.preventDefault(); setActionMenuMsg(msg); }}
                      >
                        <img src={msg.text} alt="图片" className="w-full h-auto rounded-2xl" />
                      </div>
                    ) : isSticker ? (
                      <div 
                        className="max-w-[140px] cursor-pointer"
                        onPointerDown={() => startLongPress(msg)}
                        onPointerUp={cancelLongPress}
                        onPointerLeave={cancelLongPress}
                        onPointerCancel={cancelLongPress}
                        onContextMenu={(e) => { e.preventDefault(); setActionMenuMsg(msg); }}
                      >
                        <img src={msg.text} alt="表情" className="w-full h-auto" />
                      </div>
                    ) : (
                      /* 气泡 */
                      <div 
                        className={`px-[18px] py-[12px] relative shadow-sm ${
                          msg.isMe 
                            ? 'bg-[#e5b5b9] text-white rounded-[22px] rounded-tr-[6px]' 
                            : 'bg-[#faf4f5] text-gray-800 rounded-[22px] rounded-tl-[6px]'
                        }`}
                        onPointerDown={() => startLongPress(msg)}
                        onPointerUp={cancelLongPress}
                        onPointerLeave={cancelLongPress}
                        onPointerCancel={cancelLongPress}
                        onContextMenu={(e) => { e.preventDefault(); setActionMenuMsg(msg); }}
                        onClick={() => {
                          if (longPressFiredRef.current) return;
                          if (!msg.isMe && extractedMindCard && settings.showMindCard) {
                            setViewingMindCard(extractedMindCard);
                          }
                        }}
                      >
                        <div className="text-[15px] leading-relaxed break-words whitespace-pre-wrap font-medium">
                          {cleanText}
                        </div>
                        {/* 有心声卡片时显示粉色圆点 */}
                        {!msg.isMe && extractedMindCard && settings.showMindCard && (
                          <div className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-pink-400 shadow-sm"></div>
                        )}
                        {/* 对方气泡普通红点装饰（无心声时） */}
                        {!msg.isMe && !(extractedMindCard && settings.showMindCard) && (
                          <div className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-[#d6858e] shadow-sm"></div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {/* 底部留白 */}
          <div className="h-2"></div>
        </div>

        {/* 心声卡片查看弹窗 */}
        <AnimatePresence>
          {viewingMindCard && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setViewingMindCard(null)}
                className="fixed inset-0 bg-black/30 z-[90]"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed left-[5%] right-[5%] top-[15%] bottom-[10%] z-[91] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              >
                {/* 头部 */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <div className="text-[16px] text-gray-800 font-semibold">TA 的心声</div>
                  <button 
                    onClick={() => setViewingMindCard(null)}
                    className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
                  </button>
                </div>
                
                {/* 内容区域 */}
                <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3">
                  {viewingMindCard.attire && (
                    <div className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[14px]">💜</span>
                        <span className="text-[14px] font-semibold text-gray-800">衣着打扮</span>
                      </div>
                      <div className="text-[14px] text-gray-600 leading-relaxed">{viewingMindCard.attire}</div>
                    </div>
                  )}
                  {viewingMindCard.action && (
                    <div className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[14px]">💜</span>
                        <span className="text-[14px] font-semibold text-gray-800">行为动作</span>
                      </div>
                      <div className="text-[14px] text-gray-600 leading-relaxed">{viewingMindCard.action}</div>
                    </div>
                  )}
                  {viewingMindCard.thought && (
                    <div className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[14px]">💗</span>
                        <span className="text-[14px] font-semibold text-gray-800">真实心声</span>
                      </div>
                      <div className="text-[14px] text-gray-600 leading-relaxed">{viewingMindCard.thought}</div>
                    </div>
                  )}
                  {viewingMindCard.dark_side && (
                    <div className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[14px]">🖤</span>
                        <span className="text-[14px] font-semibold text-gray-800">阴暗面</span>
                      </div>
                      <div className="text-[14px] text-gray-600 leading-relaxed">{viewingMindCard.dark_side}</div>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* 长按气泡操作菜单 */}
        <AnimatePresence>
          {actionMenuMsg && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActionMenuMsg(null)}
                className="fixed inset-0 bg-black/30 z-[100]"
              />
              <motion.div
                initial={{ opacity: 0, y: '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '100%' }}
                transition={{ type: "spring", damping: 25, stiffness: 300, mass: 0.8 }}
                className="fixed bottom-0 left-0 right-0 z-[110] p-3 pb-8"
              >
                <div className="bg-[#f7f7f7] rounded-[14px] overflow-hidden mb-2">
                  {/* 引用 */}
                  <button onClick={() => {
                    setQuotedMessage(actionMenuMsg);
                    setActionMenuMsg(null);
                  }} className="w-full flex items-center justify-center gap-2 py-[15px] border-b border-gray-200/60 active:bg-gray-200/50 bg-white">
                    <MessageSquare size={18} className="text-[#333333]" />
                    <span className="text-[16px] text-[#333333]">引用</span>
                  </button>
                  {/* 复制 */}
                  <button onClick={() => {
                    try { navigator.clipboard.writeText(actionMenuMsg.text); } catch(e) {}
                    setActionMenuMsg(null);
                  }} className="w-full flex items-center justify-center gap-2 py-[15px] border-b border-gray-200/60 active:bg-gray-200/50 bg-white">
                    <Copy size={18} className="text-[#333333]" />
                    <span className="text-[16px] text-[#333333]">复制</span>
                  </button>
                  {/* 编辑 */}
                  {(!actionMenuMsg.msgType || actionMenuMsg.msgType === 'text' || actionMenuMsg.msgType === 'narrator') && (
                    <button onClick={() => {
                      setEditingMsg(actionMenuMsg);
                      setEditingText(actionMenuMsg.text || '');
                      setActionMenuMsg(null);
                    }} className="w-full flex items-center justify-center gap-2 py-[15px] border-b border-gray-200/60 active:bg-gray-200/50 bg-white">
                      <Edit2 size={18} className="text-[#333333]" />
                      <span className="text-[16px] text-[#333333]">编辑</span>
                    </button>
                  )}
                  {/* 删除 */}
                  <button onClick={async () => {
                    if (onDeleteMessages) await onDeleteMessages(chattingFriend.id, [actionMenuMsg.id]);
                    setActionMenuMsg(null);
                  }} className="w-full flex items-center justify-center gap-2 py-[15px] border-b border-gray-200/60 active:bg-gray-200/50 bg-white">
                    <Trash2 size={18} className="text-[#333333]" />
                    <span className="text-[16px] text-[#333333]">删除</span>
                  </button>
                  {/* 插入 */}
                  <button onClick={() => {
                    setInsertModalMsg(actionMenuMsg);
                    setInsertMsgType('text');
                    setInsertText('');
                    setActionMenuMsg(null);
                  }} className="w-full flex items-center justify-center gap-2 py-[15px] border-b border-gray-200/60 active:bg-gray-200/50 bg-white">
                    <Plus size={18} className="text-[#333333]" />
                    <span className="text-[16px] text-[#333333]">插入</span>
                  </button>
                  {/* 多选 */}
                  <button onClick={() => {
                    setIsMultiSelecting(true);
                    setSelectedMsgIds([actionMenuMsg.id]);
                    setActionMenuMsg(null);
                  }} className="w-full flex items-center justify-center gap-2 py-[15px] active:bg-gray-200/50 bg-white">
                    <LayoutGrid size={18} className="text-[#333333]" />
                    <span className="text-[16px] text-[#333333]">多选</span>
                  </button>
                </div>
                <button 
                  onClick={() => setActionMenuMsg(null)}
                  className="w-full py-[15px] bg-white rounded-[14px] text-[16px] font-medium text-[#e87a90] active:bg-gray-100"
                >
                  取消
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* 编辑消息弹窗 */}
        <AnimatePresence>
          {editingMsg && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setEditingMsg(null)}
                className="fixed inset-0 bg-black/50 z-[120]"
              />
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[20px] z-[130] pb-8 flex flex-col shadow-[0_-4px_24px_rgba(0,0,0,0.12)]"
              >
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <button className="text-[16px] text-gray-500" onClick={() => setEditingMsg(null)}>取消</button>
                  <span className="font-medium text-gray-800">编辑消息</span>
                  <button className="text-[16px] text-[#e87a90] font-medium" onClick={async () => {
                    if (editingMsg && editingText.trim() && onEditMessage) {
                      onEditMessage(chattingFriend.id, editingMsg.id, editingText.trim());
                    }
                    setEditingMsg(null);
                  }}>保存</button>
                </div>
                <div className="px-5 py-4">
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    autoFocus
                    className="w-full h-[120px] px-4 py-3 border border-gray-200 rounded-[12px] text-[15px] text-gray-800 bg-[#fafafa] focus:outline-none focus:border-pink-300 focus:bg-white transition-colors resize-none"
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* 插入消息弹窗 */}
        <AnimatePresence>
          {insertModalMsg && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setInsertModalMsg(null)}
                className="fixed inset-0 bg-black/50 z-[120]"
              />
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[20px] z-[130] pb-8 flex flex-col shadow-[0_-4px_24px_rgba(0,0,0,0.12)]"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <span className="text-[17px] font-medium text-gray-800">插入消息</span>
                  <button onClick={() => setInsertModalMsg(null)} className="text-gray-400 active:text-gray-600 p-1">
                    <X size={18} strokeWidth={2} />
                  </button>
                </div>
                <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                  {([['text', '消息'], ['narrator', '旁白']] as const).map(([type, label]) => (
                    <button
                      key={type}
                      onClick={() => setInsertMsgType(type)}
                      className={`px-4 py-1.5 rounded-full text-[14px] font-medium transition-colors ${insertMsgType === type ? 'bg-[#333] text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="px-5 py-3">
                  <textarea
                    value={insertText}
                    onChange={(e) => setInsertText(e.target.value)}
                    placeholder={insertMsgType === 'text' ? '请输入消息内容...' : '请输入旁白内容...'}
                    autoFocus
                    className="w-full h-[100px] px-4 py-3 border border-gray-200 rounded-[12px] text-[15px] text-gray-800 placeholder-gray-400 bg-[#fafafa] focus:outline-none focus:border-pink-300 focus:bg-white transition-colors resize-none"
                  />
                </div>
                <div className="flex items-center gap-3 px-5 pt-1 pb-2">
                  <button
                    onClick={() => {
                      if (!insertText.trim() || !insertModalMsg || !onSendMessage) return;
                      onSendMessage(chattingFriend.id, insertText.trim(), true, insertMsgType === 'narrator' ? 'narrator' : 'text');
                      setInsertModalMsg(null);
                      setInsertText('');
                    }}
                    className="flex-1 py-3 bg-[#333] text-white rounded-[12px] text-[15px] font-medium active:bg-black transition-colors"
                  >
                    ↑ 上插
                  </button>
                  <button
                    onClick={() => {
                      if (!insertText.trim() || !insertModalMsg || !onSendMessage) return;
                      onSendMessage(chattingFriend.id, insertText.trim(), true, insertMsgType === 'narrator' ? 'narrator' : 'text');
                      setInsertModalMsg(null);
                      setInsertText('');
                    }}
                    className="flex-1 py-3 bg-[#333] text-white rounded-[12px] text-[15px] font-medium active:bg-black transition-colors"
                  >
                    ↓ 下插
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* 功能栏面板 */}
        <AnimatePresence>
          {showPluginPanel && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPluginPanel(false)}
                className="fixed inset-0 bg-black/20 z-[80]"
              />
              <motion.div
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 60 }}
                transition={{ type: 'spring', damping: 25 }}
                className="absolute bottom-[70px] left-3 right-3 z-[81] bg-white/95 backdrop-blur-xl rounded-[24px] p-5 shadow-[0_-4px_24px_rgba(0,0,0,0.1)] border border-pink-100/50"
              >
                <div className="grid grid-cols-4 gap-4">
                  {/* 线下 */}
                  <button onClick={() => {
                    setShowPluginPanel(false);
                    if (!offlineStartTime) {
                      const now = Date.now();
                      setOfflineStartTime(now);
                      localStorage.setItem(`dream_offline_${chattingFriend.id}`, now.toString());
                      if (onSendMessage) onSendMessage(chattingFriend.id, '「你向对方发起了线下见面邀请」', true, 'system');
                    } else {
                      setOfflineStartTime(null);
                      localStorage.removeItem(`dream_offline_${chattingFriend.id}`);
                      if (onSendMessage) onSendMessage(chattingFriend.id, '「你们结束了线下见面」', true, 'system');
                    }
                  }} className="flex flex-col items-center gap-1.5">
                    <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center active:bg-pink-100 transition-colors border border-pink-100/50 ${offlineStartTime ? 'bg-pink-200' : 'bg-pink-50'}`}>
                      <MapPin className="text-[#e87a90]" size={22} strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium">线下</span>
                  </button>
                  {/* 转账 */}
                  <button onClick={() => { setShowPluginPanel(false); if (onSendMessage) onSendMessage(chattingFriend.id, '「发起了转账」', true, 'system'); }} className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 bg-pink-50 rounded-[16px] flex items-center justify-center active:bg-pink-100 transition-colors border border-pink-100/50">
                      <ArrowRightLeft className="text-[#e87a90]" size={22} strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium">转账</span>
                  </button>
                  {/* 红包 */}
                  <button onClick={() => { setShowPluginPanel(false); if (onSendMessage) onSendMessage(chattingFriend.id, '「发送了一个红包」', true, 'system'); }} className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 bg-pink-50 rounded-[16px] flex items-center justify-center active:bg-pink-100 transition-colors border border-pink-100/50">
                      <Gift className="text-[#e87a90]" size={22} strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium">红包</span>
                  </button>
                  {/* 相册 */}
                  <button onClick={() => { setShowPluginPanel(false); }} className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 bg-pink-50 rounded-[16px] flex items-center justify-center active:bg-pink-100 transition-colors border border-pink-100/50">
                      <ImageIcon className="text-[#e87a90]" size={22} strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium">相册</span>
                  </button>
                  {/* 拍照 */}
                  <button onClick={() => { setShowPluginPanel(false); }} className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 bg-pink-50 rounded-[16px] flex items-center justify-center active:bg-pink-100 transition-colors border border-pink-100/50">
                      <Camera className="text-[#e87a90]" size={22} strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium">拍照</span>
                  </button>
                  {/* 速切世界书 */}
                  <button onClick={() => { setShowPluginPanel(false); }} className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 bg-pink-50 rounded-[16px] flex items-center justify-center active:bg-pink-100 transition-colors border border-pink-100/50">
                      <Folder className="text-[#e87a90]" size={22} strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium">速切世界书</span>
                  </button>
                  {/* 重回 */}
                  <button onClick={() => { setShowPluginPanel(false); if (onTriggerAI) onTriggerAI(chattingFriend.id, true); }} className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 bg-pink-50 rounded-[16px] flex items-center justify-center active:bg-pink-100 transition-colors border border-pink-100/50">
                      <RefreshCcw className="text-[#e87a90]" size={22} strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium">重回</span>
                  </button>
                  {/* 与你 */}
                  <button onClick={() => { setShowPluginPanel(false); if (onSendMessage) onSendMessage(chattingFriend.id, '「打开了与你」', true, 'system'); }} className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 bg-pink-50 rounded-[16px] flex items-center justify-center active:bg-pink-100 transition-colors border border-pink-100/50">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e87a90" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium">与你</span>
                  </button>
                  {/* 我控！ */}
                  <button onClick={() => { setShowPluginPanel(false); if (onSendMessage) onSendMessage(chattingFriend.id, '「开启了我控模式」', true, 'system'); }} className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 bg-pink-50 rounded-[16px] flex items-center justify-center active:bg-pink-100 transition-colors border border-pink-100/50">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e87a90" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium">我控！</span>
                  </button>
                  {/* 视频 */}
                  <button onClick={() => { setShowPluginPanel(false); if (onSendMessage) onSendMessage(chattingFriend.id, '「发起了视频通话」', true, 'system'); }} className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 bg-pink-50 rounded-[16px] flex items-center justify-center active:bg-pink-100 transition-colors border border-pink-100/50">
                      <Video className="text-[#e87a90]" size={22} strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium">视频</span>
                  </button>
                  {/* 电话 */}
                  <button onClick={() => { setShowPluginPanel(false); if (onSendMessage) onSendMessage(chattingFriend.id, '「发起了语音通话」', true, 'system'); }} className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 bg-pink-50 rounded-[16px] flex items-center justify-center active:bg-pink-100 transition-colors border border-pink-100/50">
                      <Phone className="text-[#e87a90]" size={22} strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium">电话</span>
                  </button>
                  {/* 梦境 */}
                  <button onClick={() => { setShowPluginPanel(false); if (onSendMessage) onSendMessage(chattingFriend.id, '「进入了梦境」', true, 'system'); }} className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 bg-pink-50 rounded-[16px] flex items-center justify-center active:bg-pink-100 transition-colors border border-pink-100/50">
                      <CloudMoon className="text-[#e87a90]" size={22} strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium">梦境</span>
                  </button>
                  {/* 位置 */}
                  <button onClick={() => { setShowPluginPanel(false); if (onSendMessage) onSendMessage(chattingFriend.id, '「发送了位置」', true, 'system'); }} className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 bg-pink-50 rounded-[16px] flex items-center justify-center active:bg-pink-100 transition-colors border border-pink-100/50">
                      <Navigation className="text-[#e87a90]" size={22} strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium">位置</span>
                  </button>
                  {/* 衣帽间 */}
                  <button onClick={() => { setShowPluginPanel(false); if (onSendMessage) onSendMessage(chattingFriend.id, '「打开了衣帽间」', true, 'system'); }} className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 bg-pink-50 rounded-[16px] flex items-center justify-center active:bg-pink-100 transition-colors border border-pink-100/50">
                      <Shirt className="text-[#e87a90]" size={22} strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium">衣帽间</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* 多选模式底栏 */}
        {isMultiSelecting && (
          <div className="bg-white/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-t border-pink-100/50 z-30 pb-[env(safe-area-inset-bottom,12px)]">
            <button
              onClick={async () => {
                if (selectedMsgIds.length > 0 && onDeleteMessages) {
                  await onDeleteMessages(chattingFriend.id, selectedMsgIds);
                  setIsMultiSelecting(false);
                  setSelectedMsgIds([]);
                }
              }}
              disabled={selectedMsgIds.length === 0}
              className={`flex-1 py-3 rounded-[12px] text-[15px] font-medium transition-colors flex items-center justify-center gap-2 ${selectedMsgIds.length > 0 ? 'bg-red-500 text-white active:bg-red-600' : 'bg-gray-100 text-gray-400'}`}
            >
              <Trash2 size={16} />
              删除 ({selectedMsgIds.length})
            </button>
          </div>
        )}

        {/* 底部输入区 */}
        {!isMultiSelecting && <div className="bg-[#fcfafb] px-4 py-3 relative z-20 pb-[env(safe-area-inset-bottom,12px)]">
          <div className="flex items-center gap-3">
            {/* 左侧功能栏按钮 */}
            <button 
              className="shrink-0 active:opacity-50"
              onClick={() => setShowPluginPanel(!showPluginPanel)}
            >
              <Plus size={26} className="text-gray-600" strokeWidth={2} />
            </button>
            
            <div className="flex-1 relative">
              <input 
                type="text" 
                className={`w-full rounded-full pl-5 pr-10 py-2.5 text-[14px] text-gray-700 placeholder-gray-400 focus:outline-none shadow-sm transition-colors ${isNarratorMode ? 'bg-pink-50 border border-pink-300' : 'bg-white'}`}
                placeholder={isNarratorMode ? "请输入旁白..." : "请输入消息..."}
                onFocus={() => setShowPluginPanel(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim() && onSendMessage) {
                    const text = e.currentTarget.value.trim();
                    e.currentTarget.value = '';
                    onSendMessage(chattingFriend.id, text, true, isNarratorMode ? 'narrator' : 'text');
                  }
                }}
              />
              <button 
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center cursor-pointer"
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  if (input && input.value.trim() && onSendMessage) {
                    const text = input.value.trim();
                    input.value = '';
                    onSendMessage(chattingFriend.id, text, true, isNarratorMode ? 'narrator' : 'text');
                  }
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
              </button>
            </div>

            {/* 线下模式：铅笔 + 爱心 / 在线模式：爱心触发AI */}
            {!!offlineStartTime ? (
              <div className="flex items-center gap-1 shrink-0">
                {/* 铅笔：旁白模式切换（不回收键盘） */}
                <button
                  className={`active:scale-95 transition-transform ${isNarratorMode ? 'text-pink-400' : 'text-gray-500'}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsNarratorMode(!isNarratorMode);
                  }}
                >
                  <div className={`w-[28px] h-[28px] rounded-full border-2 flex items-center justify-center transition-colors ${isNarratorMode ? 'border-pink-400 bg-pink-50' : 'border-gray-400'}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-inherit">
                      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                  </div>
                </button>
                {/* 爱心：触发AI回复 */}
                <button 
                  className="active:opacity-50"
                  onClick={() => {
                    if (onTriggerAI) {
                      onTriggerAI(chattingFriend.id, true);
                    }
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e87a90" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                </button>
              </div>
            ) : (
              <button 
                className="shrink-0 active:opacity-50"
                onClick={() => {
                  if (onTriggerAI) {
                    onTriggerAI(chattingFriend.id, true);
                  }
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#e87a90" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </button>
            )}
          </div>
        </div>}
      </div>
    );
  }

  if (selectedFriend) {
    return (
      <div className="fixed inset-0 bg-[#fef7f9] z-50 flex flex-col animate-in slide-in-from-right duration-200"
           style={{ backgroundImage: 'radial-gradient(#ffd6e0 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}>
        {/* Header */}
        <div className="bg-transparent px-4 pt-12 pb-3 relative z-20 flex items-center justify-between">
          <button 
            onClick={() => setSelectedFriend(null)}
            className="w-8 h-8 flex items-center justify-center active:opacity-50 transition-opacity bg-white/40 rounded-full border border-pink-100 backdrop-blur-sm"
          >
            <ChevronLeft size={20} className="text-gray-700" />
          </button>
          <div className="text-[17px] font-medium text-gray-800 tracking-wider">入 梦 资 料</div>
          <button className="w-8 h-8 flex items-center justify-center active:opacity-50 transition-opacity bg-white/40 rounded-full border border-pink-100 backdrop-blur-sm">
            <MoreHorizontal size={20} className="text-gray-700" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pt-2 pb-8">
          {/* 个人信息卡片 */}
          <div className="bg-white/90 backdrop-blur-xl rounded-[32px] p-6 border border-pink-100 shadow-[0_8px_32px_rgba(255,182,193,0.25)] relative overflow-hidden mb-6">
            {/* 卡片装饰 */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-100/50 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-100/50 rounded-full blur-xl translate-y-1/2 -translate-x-1/2"></div>
            
            <div className="flex items-start justify-between relative z-10">
              <div className="flex-1">
                <div className="inline-block px-3 py-1 bg-pink-50 text-pink-500 rounded-full text-[10px] font-bold tracking-widest mb-3 border border-pink-100">DREAM PROFILE</div>
                <h2 className="text-2xl font-bold text-gray-800 tracking-wider mb-2">{selectedFriend.wechat_remark || selectedFriend.name || '未知朋友'}</h2>
                <p className="text-[13px] text-gray-500 tracking-widest flex items-center gap-1.5 mb-1">
                  <span className="w-12 inline-block">标识：</span> {selectedFriend.id || '未知'}
                </p>
                <p className="text-[13px] text-gray-500 tracking-widest flex items-center gap-1.5">
                  <span className="w-12 inline-block">来源：</span> {selectedFriend.location || '梦境深处'}
                </p>
              </div>
              
              <div className="w-20 h-24 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-100 shadow-inner flex flex-col items-center justify-center border-4 border-white rotate-2 hover:rotate-0 transition-transform overflow-hidden shrink-0">
                {selectedFriend.avatar ? (
                  <img src={selectedFriend.avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl mb-1">{selectedFriend.emoji || '🧸'}</span>
                )}
              </div>
            </div>
            
            {/* 个性签名 */}
            <div className="mt-5 pt-5 border-t border-pink-50/50 relative z-10">
              <div className="text-[12px] text-pink-300 font-medium mb-1.5 tracking-widest">签名</div>
              <div className="text-[14px] text-gray-600 leading-relaxed font-light">
                {selectedFriend.signature || '这个人很神秘，什么都没写...'}
              </div>
            </div>
          </div>

          {/* 操作按钮区 */}
          <div className="space-y-4">
            {/* 发消息 */}
            <button 
              className="w-full bg-white/80 backdrop-blur-md rounded-3xl py-4 flex items-center justify-center gap-3 border border-pink-100 shadow-[0_4px_16px_rgba(255,182,193,0.15)] active:scale-[0.98] transition-transform"
              onClick={() => {
                setChattingFriend(selectedFriend);
              }}
            >
              <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-pink-400">
                <MessageSquare size={16} />
              </div>
              <span className="text-gray-700 text-[16px] font-medium tracking-wider">唤 起 联 系</span>
            </button>

            {/* 清空记录 */}
            <button 
              className="w-full bg-white/60 backdrop-blur-md rounded-3xl py-4 px-5 flex items-center justify-between border border-red-50 shadow-[0_4px_16px_rgba(255,182,193,0.05)] active:scale-[0.98] transition-transform"
              onClick={() => {
                if (window.confirm('确认要遗忘所有与Ta的记录与心声吗？此操作不可逆。')) {
                  if (onClearChat) {
                    onClearChat(selectedFriend.id);
                  }
                  alert('已遗忘');
                }
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </div>
                <span className="text-red-400 text-[15px] font-medium tracking-wide">遗忘这段记忆</span>
              </div>
              <ChevronLeft size={16} className="text-red-200 rotate-180" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#fef7f9] z-50 flex flex-col"
         style={{ backgroundImage: 'radial-gradient(#ffd6e0 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}>
      {/* 状态栏+导航栏 */}
      <div className="bg-transparent px-4 pt-[env(safe-area-inset-top,12px)] pb-2">
        {/* 顶部导航栏 */}
        <div className="flex items-center justify-between py-2 relative">
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center active:opacity-50 transition-opacity bg-white/40 rounded-full border border-pink-100 backdrop-blur-sm"
          >
            <ChevronLeft size={20} className="text-gray-700" />
          </button>
          
          <h1 className="text-[17px] font-medium text-gray-800 tracking-wider">梦 人 间</h1>
          
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 flex items-center justify-center active:opacity-50 transition-opacity bg-white/40 rounded-full border border-pink-100 backdrop-blur-sm">
              <Plus size={20} className="text-gray-700" />
            </button>
          </div>
          
          {/* 装饰波浪线 */}
          <div className="absolute -bottom-5 left-0 right-0 h-[2px] opacity-20 pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(circle at 10px 0, transparent 10px, #ffb3c6 11px)', backgroundSize: '20px 20px', backgroundRepeat: 'repeat-x' }}>
          </div>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="px-4 pb-4 pt-1 z-10">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/80 backdrop-blur-md rounded-full px-4 py-2.5 flex items-center gap-2 border border-pink-50 shadow-[0_2px_10px_rgba(255,192,203,0.15)] justify-center">
            <Search size={14} className="text-gray-400" />
            <span className="text-sm text-gray-400 tracking-widest">搜索</span>
          </div>
        </div>
      </div>

      {/* 动态内容区域 */}
      {renderContent()}

      {/* 悬浮底部导航栏 */}
        <div className="absolute bottom-[env(safe-area-inset-bottom,20px)] left-4 right-4 z-50">
          <div className="bg-white/80 backdrop-blur-xl border border-pink-100/50 rounded-[32px] px-2 py-2 shadow-[0_8px_32px_rgba(255,182,193,0.2)]"
               style={{ backgroundImage: 'radial-gradient(rgba(255,214,224,0.3) 1px, transparent 1px)', backgroundSize: '8px 8px' }}>
            <div className="flex items-center justify-around relative z-10 py-1">
              {/* 梦境 */}
              <button 
                className={`flex flex-col items-center gap-1 py-1 px-4 active:opacity-50 transition-opacity ${currentTab === 'records' ? '' : 'opacity-60'}`}
                onClick={() => setCurrentTab('records')}
              >
                <div className={`w-10 h-10 rounded-[16px] flex items-center justify-center ${currentTab === 'records' ? 'bg-white shadow-sm border border-pink-100' : 'bg-transparent'} mb-0.5 transition-all`}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={currentTab === 'records' ? '#e87a90' : '#999'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    <path d="M7 15V5a2 2 0 0 1 2-2h12"/>
                    <path d="M12 9h4"/>
                    <path d="M12 12h2"/>
                  </svg>
                </div>
                <span className={`text-[11px] ${currentTab === 'records' ? 'text-gray-700' : 'text-gray-400'} tracking-widest transition-colors font-medium`}>梦境</span>
              </button>

              {/* 通讯录 */}
              <button 
                className={`flex flex-col items-center gap-1 py-1 px-4 active:opacity-50 transition-opacity ${currentTab === 'archive' ? '' : 'opacity-60'}`}
                onClick={() => setCurrentTab('archive')}
              >
                <div className={`w-10 h-10 rounded-[16px] flex items-center justify-center ${currentTab === 'archive' ? 'bg-white shadow-sm border border-pink-100' : 'bg-transparent'} mb-0.5 transition-all`}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={currentTab === 'archive' ? '#e87a90' : '#999'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <span className={`text-[11px] ${currentTab === 'archive' ? 'text-gray-700' : 'text-gray-400'} tracking-widest transition-colors font-medium`}>通讯录</span>
              </button>
              
              {/* 发现 */}
              <button 
                className={`flex flex-col items-center gap-1 py-1 px-4 active:opacity-50 transition-opacity relative ${currentTab === 'face' ? '' : 'opacity-60'}`}
                onClick={() => setCurrentTab('face')}
              >
                {currentTab !== 'face' && <div className="absolute top-2 right-4 w-1.5 h-1.5 bg-pink-400 rounded-full"></div>}
                <div className={`w-10 h-10 rounded-[16px] flex items-center justify-center ${currentTab === 'face' ? 'bg-white shadow-sm border border-pink-100' : 'bg-transparent'} mb-0.5 transition-all`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={currentTab === 'face' ? '#e87a90' : '#999'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
                  </svg>
                </div>
                <span className={`text-[11px] ${currentTab === 'face' ? 'text-gray-700' : 'text-gray-400'} tracking-widest transition-colors font-medium`}>发现</span>
              </button>

              {/* 我 */}
              <button 
                className={`flex flex-col items-center gap-1 py-1 px-4 active:opacity-50 transition-opacity ${currentTab === 'me' ? '' : 'opacity-60'}`}
                onClick={() => setCurrentTab('me')}
              >
                <div className={`w-10 h-10 rounded-[16px] flex items-center justify-center ${currentTab === 'me' ? 'bg-white shadow-sm border border-pink-100' : 'bg-transparent'} mb-0.5 transition-all`}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={currentTab === 'me' ? '#e87a90' : '#999'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="10" r="3"></circle><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"></path>
                  </svg>
                </div>
                <span className={`text-[11px] ${currentTab === 'me' ? 'text-gray-700' : 'text-gray-400'} tracking-widest transition-colors font-medium`}>我</span>
              </button>
            </div>
          </div>
        </div>
    </div>
  );
};
