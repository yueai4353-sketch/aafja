import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Home, HelpCircle, User, MapPin, Plus, Store, Edit3, Filter, MessageSquare, Image as ImageIcon, RefreshCw, X, Loader2, Trash2 } from 'lucide-react';
import {
  buildWorldbookText,
  buildRecentChatText,
  buildMySchedulePrompt,
  buildOtherSchedulePrompt,
} from '../utils/schedulePrompt';
import {
  loadMySchedule,
  saveMySchedule,
  loadOtherSchedule,
  saveOtherSchedule,
  loadSelectedPersonaId,
  saveSelectedPersonaId,
  type ScheduleItem,
} from '../db/youandme';

interface YouAndMeAppProps {
  onClose: () => void;
  personas?: any[];
  myProfile?: any;
}

export const YouAndMeApp: React.FC<YouAndMeAppProps> = ({ onClose, personas = [], myProfile = {} }) => {
  const [activeTab, setActiveTab] = useState<'日常记录' | '习惯打卡' | '备忘录'>('日常记录');
  const [showPersonaSelector, setShowPersonaSelector] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(() => loadSelectedPersonaId());
  const [showMomentDetail, setShowMomentDetail] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleView, setScheduleView] = useState<'my' | 'other'>('my');
  const [showRefreshPrompt, setShowRefreshPrompt] = useState(false);
  const [refreshPromptText, setRefreshPromptText] = useState('');
  const [linkSchedule, setLinkSchedule] = useState(false); // 是否联动对方/我的日程
  // 日程条目：从持久化存储初始化
  const [myScheduleItems, setMyScheduleItems] = useState<ScheduleItem[]>(() => loadMySchedule());
  const [otherScheduleItems, setOtherScheduleItems] = useState<ScheduleItem[]>(() => loadOtherSchedule());
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  // 编辑弹窗状态
  const [editingItem, setEditingItem] = useState<{index:number;date:string;time:string;text:string} | null>(null);

  const selectedPersona = personas.find(p => p.id === selectedPersonaId) || null;

  // 日程变化时自动持久化
  useEffect(() => { saveMySchedule(myScheduleItems); }, [myScheduleItems]);
  useEffect(() => { saveOtherSchedule(otherScheduleItems); }, [otherScheduleItems]);

  const handleConfirmSchedule = async () => {
    // 关闭弹窗，保存调用时刻的 state 快照（避免异步闭包问题）
    const currentView = scheduleView;
    const currentLinkSchedule = linkSchedule;
    const currentRefreshText = refreshPromptText;
    setShowRefreshPrompt(false);
    setLinkSchedule(false);
    setIsGeneratingSchedule(true);
    // 确保日程弹窗保持打开（生成完成后用户能看到结果）
    setShowScheduleModal(true);

    console.log('[日程生成] 开始，view=', currentView, 'linkSchedule=', currentLinkSchedule);

    const parseLines = (raw: string): ScheduleItem[] => {
      return raw.split('\n').filter(l => l.trim()).map(line => {
        const m = line.match(/^(\d{4}\.\d{1,2}\.\d{1,2})\/(\d{2}:\d{2})\s+(.*)/);
        if (m) return { date: m[1], time: m[2], text: m[3] };
        return { date: '', time: '', text: line };
      });
    };

    const itemsToText = (items: ScheduleItem[]) =>
      items.map(i => `${i.date ? i.date + '/' : ''}${i.time ? i.time + '  ' : ''}${i.text}`).join('\n');

    const setErr = (msg: string) => {
      console.error('[日程生成] 错误:', msg);
      const errItem: ScheduleItem = { date: '', time: '', text: msg };
      if (currentView === 'my') setMyScheduleItems([errItem]);
      else setOtherScheduleItems([errItem]);
    };

    try {
      // 读取 API 配置
      const apiKey = (localStorage.getItem('os_api_key') || '').trim();
      const apiBaseUrl = (localStorage.getItem('os_api_url') || 'https://api.openai.com/v1').replace(/\/$/, '');
      const apiModel = (localStorage.getItem('os_api_model') || '').trim();

      console.log('[日程生成] API配置 — key:', apiKey ? '已设置' : '未设置', 'model:', apiModel || '未设置', 'baseUrl:', apiBaseUrl);

      if (!apiKey) { setErr('⚠️ 未配置 API Key，请先在设置中填写。'); return; }
      if (!apiModel) { setErr('⚠️ 未配置模型名称，请先在设置中填写。'); return; }

      const now = new Date();
      const myName = myProfile?.real_name || myProfile?.name || '我';

      console.log('[日程生成] 读取聊天记录，selectedPersona:', selectedPersona?.name || '无');

      // 读取聊天记录和世界书（放在 try 内，异常可被捕获）
      const recentChat = selectedPersona
        ? await buildRecentChatText(selectedPersona, myName)
        : '';
      const worldbook = selectedPersona ? buildWorldbookText(selectedPersona) : '';

      console.log('[日程生成] 准备发起 API 请求，url:', `${apiBaseUrl}/chat/completions`);

      const callAI = async (prompt: string): Promise<string> => {
        // 与微信聊天保持一致：自动补全 /chat/completions，兼容用户填写的各种 URL 格式
        let completionsUrl = apiBaseUrl;
        if (!completionsUrl.endsWith('/chat/completions')) {
          completionsUrl = completionsUrl.endsWith('/')
            ? `${completionsUrl}chat/completions`
            : `${completionsUrl}/chat/completions`;
        }
        // 校验 URL 合法性（兼容 Safari）
        let validatedUrl: string;
        try {
          validatedUrl = new URL(completionsUrl).toString();
        } catch (_e) {
          throw new Error('API 地址格式不正确，请检查设置');
        }
        console.log('[日程生成] fetch 开始，url:', validatedUrl, 'prompt长度:', prompt.length);
        const resp = await fetch(validatedUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: apiModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.8,
            max_tokens: 4096,
            stream: false,
          }),
        });
        console.log('[日程生成] fetch 响应状态:', resp.status);
        if (!resp.ok) {
          let errDetail = '';
          try { errDetail = await resp.text(); } catch (_e) {}
          throw new Error(`API 请求失败 (${resp.status}): ${errDetail.substring(0, 200)}`);
        }

        // 与微信聊天完全一致的响应处理：兼容某些 API 即使 stream:false 仍返回 SSE 流式数据
        const contentType = resp.headers.get('content-type') || '';
        let fullText = '';

        console.log('[日程生成] content-type:', contentType);
        if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
          // 流式 SSE 响应：逐块读取
          const reader = resp.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let chunkCount = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            if (chunkCount === 0) console.log('[日程生成] 第一个SSE chunk(前300):', chunk.substring(0, 300));
            chunkCount++;
            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const jsonStr = trimmed.slice(5).trim();
              if (jsonStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (typeof delta === 'string') fullText += delta;
                const directContent = parsed.choices?.[0]?.message?.content;
                if (typeof directContent === 'string') fullText += directContent;
                // 兼容 reasoning_content（部分 API）
                const reasoning = parsed.choices?.[0]?.delta?.reasoning_content;
                if (typeof reasoning === 'string' && !fullText) fullText += reasoning;
              } catch (_e) {}
            }
          }
          console.log('[日程生成] SSE读取完毕，chunks:', chunkCount, 'fullText长度:', fullText.length);
        } else {
          // 标准 JSON 响应（或伪装成 JSON 的 SSE）
          const rawText = await resp.text();
          console.log('[日程生成] 响应原始文本前500字符:', rawText.substring(0, 500));

          // 兼容：即使 content-type 是 application/json，内容也可能是 SSE 格式
          if (rawText.trimStart().startsWith('data:')) {
            const lines = rawText.split('\n');
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const jsonStr = trimmed.slice(5).trim();
              if (jsonStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (typeof delta === 'string') fullText += delta;
                const directContent = parsed.choices?.[0]?.message?.content;
                if (typeof directContent === 'string') fullText += directContent;
              } catch (_e) {}
            }
          } else {
            try {
              const rawData = JSON.parse(rawText);
              if (rawData.choices?.[0]?.message) {
                fullText = rawData.choices[0].message.content || '';
              } else if (rawData.text) {
                fullText = rawData.text;
              } else if (rawData.error) {
                throw new Error(typeof rawData.error === 'string' ? rawData.error : JSON.stringify(rawData.error));
              } else {
                throw new Error(`API 返回格式异常: ${rawText.substring(0, 150)}`);
              }
            } catch (e: any) {
              if (e.message.startsWith('API')) throw e;
              throw new Error(`无法解析 API 响应: ${rawText.substring(0, 150)}`);
            }
          }
        }

        const content = fullText.trim();
        console.log('[日程生成] AI 返回内容长度:', content.length);
        if (!content) throw new Error('AI 返回内容为空，请重试');
        return content;
      };

      if (currentView === 'my') {
        const otherScheduleText = currentLinkSchedule && otherScheduleItems.length > 0
          ? itemsToText(otherScheduleItems) : undefined;
        const prompt = buildMySchedulePrompt({ myProfile, worldbook, recentChat, extraNote: currentRefreshText, now, otherSchedule: otherScheduleText });
        console.log('[日程生成] 调用 callAI（我的日程）');
        const result = await callAI(prompt);
        setMyScheduleItems(parseLines(result));
        console.log('[日程生成] 我的日程更新完成，条数:', parseLines(result).length);
      } else {
        if (!selectedPersona) {
          setErr('⚠️ 未选择人设，请先在左下角选择角色。');
        } else {
          const myScheduleText = currentLinkSchedule && myScheduleItems.length > 0
            ? itemsToText(myScheduleItems) : undefined;
          const prompt = buildOtherSchedulePrompt({ persona: selectedPersona, worldbook, recentChat, extraNote: currentRefreshText, now, mySchedule: myScheduleText });
          console.log('[日程生成] 调用 callAI（对方日程）');
          const result = await callAI(prompt);
          setOtherScheduleItems(parseLines(result));
          console.log('[日程生成] 对方日程更新完成，条数:', parseLines(result).length);
        }
      }
    } catch (err: any) {
      console.error('[日程生成] catch 错误:', err);
      setErr(`⚠️ 生成失败：${err.message || '未知错误'}`);
    } finally {
      setIsGeneratingSchedule(false);
      setRefreshPromptText('');
      console.log('[日程生成] finally 执行完毕');
    }
  };

  const maleAvatar = selectedPersonaId 
    ? personas.find(p => p.id === selectedPersonaId)?.my_bound_avatar || personas.find(p => p.id === selectedPersonaId)?.avatar
    : null;
    
  const maleName = selectedPersonaId
    ? personas.find(p => p.id === selectedPersonaId)?.name || '默认'
    : '默认';

  const femaleAvatar = myProfile?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia&backgroundColor=ffdfbf";
  const femaleName = myProfile?.name || '默认';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-50 bg-[#ffd4d4] flex flex-col font-sans overflow-hidden"
    >
      {/* 顶部导航 */}
      <div className="flex items-center justify-between px-3 pt-6 pb-2 bg-white/20 backdrop-blur-sm z-10">
        <div className="flex gap-2">
          <button onClick={onClose} className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center text-[#ff9e9e] shadow-sm">
             <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center text-[#ff9e9e] shadow-sm">
             <Home className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center text-[#ff9e9e] shadow-sm">
             <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
        <div className="flex items-center bg-black/40 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 gap-1 sm:gap-2">
          <div className="w-4 h-4 sm:w-5 sm:h-5 bg-[#ffb4b4] rounded-full flex items-center justify-center">
            <span className="text-white text-[10px] sm:text-xs font-bold">¥</span>
          </div>
          <span className="text-white text-xs sm:text-sm font-medium">0</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-6 relative z-10">
        {/* 头像与等级区域 */}
        <div className="px-3 sm:px-4 pt-2 sm:pt-4 pb-1 sm:pb-2">
          <div className="flex items-end justify-between relative">
             <div className="flex gap-2 sm:gap-4">
                {/* 男主 */}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full border-[3px] border-white bg-white overflow-hidden shadow-md relative flex items-center justify-center">
                     {maleAvatar ? (
                       <img src={maleAvatar} alt="Left" className="w-full h-full object-cover" />
                     ) : (
                       <User className="w-6 h-6 text-gray-400" />
                     )}
                     <div className="absolute inset-0 rounded-full border border-[#ffb4b4]"></div>
                  </div>
                  <div className="bg-white/60 px-2 sm:px-3 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <span className="text-[#d88c8c] font-medium text-[10px] sm:text-xs">{maleName}</span>
                    <Edit3 className="w-2.5 h-2.5 text-[#d88c8c]" />
                  </div>
                </div>

                {/* 女主 */}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full border-[3px] border-white bg-white overflow-hidden shadow-md relative flex items-center justify-center">
                     {femaleAvatar && !femaleAvatar.includes('dicebear') ? (
                       <img src={femaleAvatar} alt="Right" className="w-full h-full object-cover" />
                     ) : (
                       <User className="w-6 h-6 text-gray-400" />
                     )}
                     <div className="absolute inset-0 rounded-full border border-[#ffb4b4]"></div>
                  </div>
                  <div className="bg-white/60 px-2 sm:px-3 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <span className="text-[#d88c8c] font-medium text-[10px] sm:text-xs">{femaleName}</span>
                    <Edit3 className="w-2.5 h-2.5 text-[#d88c8c]" />
                  </div>
                </div>
             </div>

             {/* 共愿等级 */}
             <div className="flex flex-col items-end">
               <div className="flex items-baseline gap-1 text-[#ff8c8c]">
                 <span className="text-[10px] font-medium">共愿等级</span>
                 <span className="text-2xl sm:text-3xl font-black italic tracking-tighter" style={{ WebkitTextStroke: '1px white' }}>00</span>
               </div>
               <div className="w-16 sm:w-20 h-1 sm:h-1.5 bg-white/50 rounded-full mt-0.5 relative overflow-hidden">
                 <div className="absolute left-0 top-0 bottom-0 bg-[#ff9e9e] w-0"></div>
               </div>
               <span className="text-[9px] text-[#ff8c8c] mt-0.5">0/10</span>
             </div>
          </div>
          
          <div className="flex justify-end gap-1.5 mt-1 sm:mt-2">
             <button className="bg-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[#ff8c8c] font-medium shadow-sm border border-[#ffdfdf] flex items-center gap-1 text-[10px] sm:text-xs">
               点滴日常
             </button>
             <button className="bg-white w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[#ff8c8c] shadow-sm border border-[#ffdfdf] relative">
               <Store className="w-3 h-3 sm:w-4 sm:h-4" />
               <div className="absolute -top-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-500 rounded-full border border-white"></div>
             </button>
          </div>
        </div>

        {/* 内容卡片区 */}
        <div className="px-4">
          <div className="bg-white rounded-3xl p-1 pb-4 shadow-sm border border-[#ffdfdf]">
             {/* Tab栏 */}
             <div className="flex bg-[#fff0f0] rounded-t-3xl overflow-hidden mb-4 relative">
                {['日常记录', '习惯打卡', '备忘录'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`flex-1 py-3 text-center text-sm font-medium transition-colors relative ${activeTab === tab ? 'text-[#ff8c8c] bg-white' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {tab}
                    {tab === '日常记录' && <div className="absolute top-2 right-4 w-2 h-2 bg-red-500 rounded-full"></div>}
                  </button>
                ))}
             </div>

             <div className="px-3 space-y-4">
               {/* 此时此刻 */}
               <button 
                 onClick={() => setShowMomentDetail(true)}
                 className="w-full text-left rounded-2xl border border-gray-100 overflow-hidden shadow-sm transition-transform active:scale-[0.98] cursor-pointer block hover:border-[#ffb4b4]"
               >
                 <div className="bg-[#5c5c5c] px-3 py-1.5 text-white text-xs flex items-center gap-2 relative">
                   <div className="w-1.5 h-1.5 bg-[#ff8c8c] rounded-full"></div>
                   此时此刻
                   <div className="absolute -top-1.5 right-2 text-xl drop-shadow-sm">🦁</div>
                   <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                 </div>
                 <div className="p-3 pl-8 relative bg-[#fcfcfc]">
                   <div className="absolute left-4 top-3 bottom-3 w-px border-l border-dashed border-[#ffb4b4]"></div>
                   <div className="absolute left-[13px] top-3.5 w-2 h-2 bg-[#ffb4b4] rounded-full border border-white"></div>
                   <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">07.30 这是我们开始使用APP的第一天！</p>
                 </div>
               </button>

               {/* 最新动态 */}
               <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                 <div className="bg-[#5c5c5c] px-3 py-1.5 text-white text-xs flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 bg-[#ff8c8c] rounded-full"></div>
                     最新动态
                   </div>
                   <span className="text-[10px] text-gray-300">今日天气 23-29° ☀️</span>
                 </div>
                 <div className="p-3 flex items-center gap-3 bg-[#fcfcfc] relative">
                   <div className="w-5 h-5 rounded-full bg-[#ffe4e4] flex items-center justify-center flex-shrink-0">
                     <span className="text-[10px]">🐾</span>
                   </div>
                   <div className="flex-1">
                     <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
                       <span className="font-medium">17:58</span>
                       <MapPin className="w-3.5 h-3.5 text-gray-400" />
                       <span>左然正在客厅</span>
                     </div>
                   </div>
                 </div>
               </div>

               {/* 外出计划 */}
               <div className="grid grid-cols-2 gap-3">
                 <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm relative">
                   <div className="bg-[#5c5c5c] px-3 py-1 text-white text-[10px] flex items-center gap-1.5">
                     <div className="w-1 h-1 bg-[#ff8c8c] rounded-full"></div>
                     本次外出
                   </div>
                   <div className="p-2 bg-[#fcfcfc] flex items-center justify-center">
                     <div className="w-10 h-10 border border-dashed border-[#ffb4b4] rounded-lg flex items-center justify-center text-[#ffb4b4]">
                       <Plus className="w-5 h-5" />
                     </div>
                   </div>
                   <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full z-10"></div>
                 </div>

                 <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm relative">
                   <div className="bg-[#5c5c5c] px-3 py-1 text-white text-[10px] flex items-center gap-1.5">
                     <div className="w-1 h-1 bg-[#ff8c8c] rounded-full"></div>
                     下次外出
                   </div>
                   <div className="p-2 bg-[#fcfcfc] flex items-center justify-center">
                     <div className="w-10 h-10 border border-dashed border-[#ffb4b4] rounded-lg flex items-center justify-center text-[#ffb4b4]">
                       <Plus className="w-5 h-5" />
                     </div>
                   </div>
                   <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full z-10"></div>
                 </div>
               </div>

             </div>
          </div>
        </div>
      </div>

      {/* 底部悬浮按钮 (左侧) */}
      <div className="fixed bottom-3 left-3 flex gap-2 sm:gap-3 z-50">
        <button 
          onClick={() => setShowPersonaSelector(true)}
          className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center shadow-md border border-[#ffdfdf] relative hover:bg-gray-50 transition-colors active:scale-95 cursor-pointer"
        >
          <User className="w-4 h-4 sm:w-5 sm:h-5 text-[#ff8c8c]" />
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-500 rounded-full border border-white"></div>
        </button>
        <button className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center shadow-md border border-[#ffdfdf] relative hover:bg-gray-50 transition-colors active:scale-95 cursor-pointer">
          <div className="w-4 h-4 sm:w-5 sm:h-5 text-[#ff8c8c] flex items-center justify-center text-sm sm:text-lg">🎁</div>
        </button>
      </div>

      {/* 底部悬浮按钮 (右侧) */}
      <div className="fixed bottom-3 right-3 z-50">
        <button 
          onClick={() => setShowScheduleModal(true)}
          className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-tr from-[#ff8c8c] to-[#ffb4b4] rounded-full flex items-center justify-center shadow-md shadow-red-200/50 border-[1.5px] border-white relative transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <div className="flex flex-col items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mb-0 sm:mb-0.5 sm:w-5 sm:h-5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span className="text-[7px] sm:text-[8px] font-bold tracking-wider leading-none">日程</span>
          </div>
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-yellow-400 rounded-full border border-white shadow-sm"></div>
        </button>
      </div>
      
      {/* 选角弹窗 */}
      {showPersonaSelector && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-end">
          <div className="bg-white w-full max-w-md rounded-t-3xl overflow-hidden shadow-2xl flex flex-col max-h-[70vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#fff0f0]">
              <h3 className="font-bold text-[#ff8c8c]">选择角色</h3>
              <button onClick={() => setShowPersonaSelector(false)} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 shadow-sm">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {personas.map(p => (
                <div 
                  key={p.id}
                  className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-colors ${selectedPersonaId === p.id ? 'bg-[#ffe4e4] border border-[#ffb4b4]' : 'bg-white hover:bg-gray-50 border border-transparent'}`}
                  onClick={() => {
                    setSelectedPersonaId(p.id);
                    saveSelectedPersonaId(p.id);
                    setShowPersonaSelector(false);
                  }}
                >
                   <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow-sm flex items-center justify-center">
                     {p.my_bound_avatar || p.avatar ? (
                       <img src={p.my_bound_avatar || p.avatar} alt={p.name} className="w-full h-full object-cover" />
                     ) : (
                       <User className="w-6 h-6 text-gray-400" />
                     )}
                   </div>
                   <span className="font-medium text-gray-800">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 日程弹窗 */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh] min-h-[50vh]"
          >
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#fff0f0]">
              <button 
                onClick={() => setScheduleView(scheduleView === 'my' ? 'other' : 'my')}
                className="font-bold text-[#ff8c8c] flex items-center gap-2 hover:bg-white/50 px-2 py-1 -ml-2 rounded-lg transition-colors active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                {scheduleView === 'my' ? '我的日程' : '对方日程'}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-1 opacity-70">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const items = scheduleView === 'my' ? myScheduleItems : otherScheduleItems;
                    setEditingItem({ index: items.length, date: '', time: '', text: '' });
                  }}
                  className="text-gray-400 hover:text-[#ff8c8c] bg-white rounded-full p-1.5 shadow-sm transition-colors active:scale-95"
                  title="新建日程"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setShowRefreshPrompt(true)}
                  className="text-gray-400 hover:text-[#ff8c8c] bg-white rounded-full p-1.5 shadow-sm transition-colors active:scale-95"
                  title="重新生成日程"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (scheduleView === 'my') setMyScheduleItems([]);
                    else setOtherScheduleItems([]);
                  }}
                  className="text-gray-400 hover:text-red-400 bg-white rounded-full p-1.5 shadow-sm transition-colors active:scale-95"
                  title="清空日程"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => setShowScheduleModal(false)} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1.5 shadow-sm transition-colors active:scale-95">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-[#fdfdfd]">
              {isGeneratingSchedule ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-[#ff8c8c]">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-sm">AI 正在生成日程...</span>
                </div>
              ) : (scheduleView === 'my' ? myScheduleItems : otherScheduleItems).length > 0 ? (
                <div className="space-y-1">
                  {(scheduleView === 'my' ? myScheduleItems : otherScheduleItems).map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setEditingItem({ index: idx, ...item })}
                      className="w-full text-left flex items-baseline gap-3 py-2 px-2 rounded-xl hover:bg-[#fff0f0] active:bg-[#ffe4e4] transition-colors"
                    >
                      {item.date || item.time ? (
                        <span className="font-semibold text-sm whitespace-nowrap flex-shrink-0" style={{ color: '#e89090' }}>
                          {item.date}{item.time ? `/${item.time}` : ''}
                        </span>
                      ) : null}
                      <span className="text-gray-500 text-sm leading-relaxed">{item.text}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-400">
                  <span className="text-sm">暂无日程安排</span>
                  <span className="text-xs text-gray-300">点击右上角刷新按钮生成</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* 刷新提示弹窗 */}
      {showRefreshPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white w-full max-w-[280px] rounded-3xl overflow-hidden shadow-2xl p-5 flex flex-col gap-4"
          >
            <h3 className="font-bold text-gray-800 text-center text-lg">
              {scheduleView === 'my' ? '更新我的日程' : '更新对方日程'}
            </h3>
            <textarea 
              value={refreshPromptText}
              onChange={(e) => setRefreshPromptText(e.target.value)}
              placeholder="不写默认自由发挥"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#ffb4b4] focus:ring-1 focus:ring-[#ffb4b4] resize-none h-20"
            />
            {/* 联动开关：仅在对方/我的日程有内容时显示 */}
            {((scheduleView === 'my' && otherScheduleItems.length > 0) ||
              (scheduleView === 'other' && myScheduleItems.length > 0)) && (
              <button
                onClick={() => setLinkSchedule(v => !v)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors text-sm font-medium ${linkSchedule ? 'bg-[#fff0f0] border-[#ffb4b4] text-[#ff8c8c]' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
              >
                <span>
                  {scheduleView === 'my' ? '参考对方日程联动生成' : '参考我的日程联动生成'}
                </span>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${linkSchedule ? 'bg-[#ffb4b4]' : 'bg-gray-200'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${linkSchedule ? 'left-5' : 'left-0.5'}`} />
                </div>
              </button>
            )}
            <div className="flex gap-3">
              <button 
                onClick={() => { setShowRefreshPrompt(false); setLinkSchedule(false); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium active:scale-95 transition-transform"
              >
                取消
              </button>
              <button 
                onClick={handleConfirmSchedule}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#ff8c8c] to-[#ffb4b4] text-white font-medium active:scale-95 transition-transform shadow-md shadow-red-200/50"
              >
                确定
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 编辑日程弹窗 */}
      {editingItem !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white w-full max-w-[300px] rounded-3xl shadow-2xl p-5 flex flex-col gap-3"
          >
            <h3 className="font-bold text-gray-800 text-center text-base">
              {editingItem.index === (scheduleView === 'my' ? myScheduleItems : otherScheduleItems).length ? '新建日程' : '编辑日程'}
            </h3>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-500 font-medium">日期（如 2026.6.23）</label>
              <input
                type="text"
                value={editingItem.date}
                onChange={e => setEditingItem({ ...editingItem, date: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#ffb4b4] focus:ring-1 focus:ring-[#ffb4b4]"
                placeholder="2026.6.23"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-500 font-medium">时间（如 08:00）</label>
              <input
                type="text"
                value={editingItem.time}
                onChange={e => setEditingItem({ ...editingItem, time: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#ffb4b4] focus:ring-1 focus:ring-[#ffb4b4]"
                placeholder="08:00"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-500 font-medium">事项</label>
              <textarea
                value={editingItem.text}
                onChange={e => setEditingItem({ ...editingItem, text: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#ffb4b4] focus:ring-1 focus:ring-[#ffb4b4] resize-none h-20"
                placeholder="事项描述"
              />
            </div>
            <div className="flex gap-2 mt-1">
              {editingItem.index < (scheduleView === 'my' ? myScheduleItems : otherScheduleItems).length && (
                <button
                  onClick={() => {
                    const setter = scheduleView === 'my' ? setMyScheduleItems : setOtherScheduleItems;
                    const items = scheduleView === 'my' ? [...myScheduleItems] : [...otherScheduleItems];
                    items.splice(editingItem.index, 1);
                    setter(items);
                    setEditingItem(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-400 font-medium active:scale-95 transition-transform border border-red-100 flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  删除
                </button>
              )}
              <button
                onClick={() => setEditingItem(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-medium active:scale-95 transition-transform"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const { index, date, time, text } = editingItem;
                  const setter = scheduleView === 'my' ? setMyScheduleItems : setOtherScheduleItems;
                  const items = scheduleView === 'my' ? [...myScheduleItems] : [...otherScheduleItems];
                  items[index] = { date, time, text };
                  setter(items);
                  setEditingItem(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#ff8c8c] to-[#ffb4b4] text-white font-medium active:scale-95 transition-transform shadow-md shadow-red-200/50"
              >
                保存
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 底部装饰云朵 - 简化模拟 */}
      <div className="absolute -bottom-10 left-0 right-0 h-32 bg-[#ffb4b4] opacity-20 blur-2xl rounded-[100%] z-0"></div>

      {/* 此时此刻详情页 */}
      {showMomentDetail && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="absolute inset-0 z-[60] bg-[#ffcfcf] flex flex-col font-sans overflow-hidden"
        >
          {/* 顶部导航 */}
          <div className="flex items-center justify-between px-4 pt-6 pb-2 relative z-10">
            <div className="flex gap-2">
              <button onClick={() => setShowMomentDetail(false)} className="w-9 h-9 bg-white/60 backdrop-blur-md rounded-xl flex items-center justify-center text-[#ff8c8c] shadow-sm border border-white/50">
                 <ChevronLeft className="w-5 h-5" />
              </button>
              <button className="w-9 h-9 bg-white/60 backdrop-blur-md rounded-xl flex items-center justify-center text-[#ff8c8c] shadow-sm border border-white/50">
                 <HelpCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-3">
              <button className="w-9 h-9 bg-[#4a4a4a] rounded-full flex items-center justify-center text-white shadow-md border-2 border-white/20">
                <Filter className="w-4 h-4" />
              </button>
              <button className="w-9 h-9 bg-[#4a4a4a] rounded-full flex items-center justify-center text-white shadow-md border-2 border-white/20 relative">
                <Edit3 className="w-4 h-4" />
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#4a4a4a]"></div>
              </button>
            </div>
          </div>

          {/* 标题 */}
          <div className="px-5 pb-3 pt-1 relative z-10 flex items-center gap-1.5">
            <span className="text-xl drop-shadow-sm">🦁</span>
            <span className="text-[#5c5c5c] font-medium text-sm">此时此刻</span>
          </div>

          {/* 主内容区 */}
          <div className="flex-1 bg-[#fffdfd] relative flex flex-col z-0">
            {/* 顶部波浪形装饰 */}
            <svg className="absolute -top-[18px] left-0 w-full h-[20px] text-[#fffdfd]" preserveAspectRatio="none" viewBox="0 0 375 20" style={{ fill: 'currentColor' }}>
               <path d="M0,20 C100,-5 200,25 375,0 L375,20 L0,20 Z" />
            </svg>
            
            <div className="flex-1 p-4 overflow-y-auto relative z-10 pb-32">
              {/* 内容留白区 */}
            </div>

            {/* 底部悬浮按钮 */}
            <div className="absolute bottom-24 right-5 z-20 flex flex-col items-end gap-4 pointer-events-auto">
              {/* 聊天图标 */}
              <button className="w-8 h-8 rounded-full flex items-center justify-center text-[#5c5c5c] hover:bg-gray-100 transition-colors mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-6 h-6">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2z"></path>
                </svg>
              </button>
            </div>

            {/* 底部云朵装饰 */}
            <div className="absolute bottom-0 left-0 right-0 h-32 overflow-hidden pointer-events-none z-10">
               <svg viewBox="0 0 375 120" className="absolute bottom-0 w-full h-full text-[#ffb4b4]/40" preserveAspectRatio="none" style={{ fill: 'currentColor' }}>
                  <path d="M0,120 L375,120 L375,60 C320,40 280,90 230,80 C180,70 150,20 100,50 C50,80 20,50 0,70 Z" />
               </svg>
               <svg viewBox="0 0 375 100" className="absolute bottom-0 w-full h-[80%] text-[#ff9e9e]/30" preserveAspectRatio="none" style={{ fill: 'currentColor' }}>
                  <path d="M0,100 L375,100 L375,80 C300,50 250,100 180,80 C120,60 80,90 0,80 Z" />
               </svg>
            </div>

            {/* 分割线 */}
            <div className="absolute bottom-[90px] left-8 right-8 border-b border-[#ffdfdf] z-10 pointer-events-none"></div>
            
            {/* 共享相册 */}
            <div className="absolute bottom-4 right-4 z-20 pointer-events-auto">
              <button className="flex flex-col items-center justify-center bg-[#ffe4e4] border-2 border-white px-3 py-1.5 rounded-xl shadow-md hover:bg-[#ffdfdf] transition-colors">
                <ImageIcon className="w-6 h-6 text-[#ff8c8c] mb-0.5" strokeWidth={1.5} />
                <span className="text-[10px] text-[#ff8c8c] font-medium tracking-wide">共享相册</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
