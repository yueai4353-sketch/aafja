import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Moon, Signal, Wifi, Battery, ChevronLeft, ChevronRight, User, MoreHorizontal, Plus, Send, Heart, MessageSquare, Phone, Disc, RefreshCcw, Layout, UserPlus, Users, Tag, Search, Camera, Snowflake, Edit2, CreditCard, X, Globe, Folder, Copy, Trash2, LayoutGrid, CornerUpLeft, ChevronsUpDown, Check, MapPin, ArrowRightLeft, Gift, Image as ImageIcon, Mic, Video, CloudMoon, Navigation, Shirt, Smile } from 'lucide-react';
import StickerPanel from '../components/StickerPanel';
import WoYuModal from '../components/WoYuModal';
import { getActiveRecord, revokeActiveProp, WoKongActiveRecord } from '../utils/woKongManager';
import { CurrentTime, ToggleSwitch, useCurrentTime } from '../components';
import { AppDB } from '../db';
import { fileToBase64, analyzeImage, compressImage } from '../utils/vision';
import { shouldShowTimestamp, formatChatTimestamp } from '../utils/timeUtils';
import { buildWorldbookText, buildPersonaText, buildMyProfileText } from '../utils/schedulePrompt';
import { loadOtherSchedule, loadPlotMemories, loadAboutYouEntries } from '../db/youandme';
import { summarizeChatBatch } from '../utils/memorySummarize';

const ChatSettingsScreen = ({ onBack, friend, onSetRemark, onSetWallpaper, onClearChat, onShowCotDisplayChange, myProfile }: { onBack: () => void, friend: any, onSetRemark?: (remark: string) => void, onSetWallpaper?: (wp: string) => void, onClearChat?: () => void, onShowCotDisplayChange?: (val: boolean) => void, key?: React.Key, myProfile?: any }) => {
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [remarkInput, setRemarkInput] = useState(friend.wechat_remark || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const confirmDeleteChat = () => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    setShowDeleteConfirm(true);
  };


  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [wallpaperType, setWallpaperType] = useState<'url' | 'local'>('url');
  const [wallpaperUrl, setWallpaperUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showConsoleAndToken, setShowConsoleAndToken] = useState(false);
  const [disableTimePerceive, setDisableTimePerceive] = useState(false);
  const [aiTimezone, setAiTimezone] = useState('跟随用户');
  const [onlineReplyCount, setOnlineReplyCount] = useState(0);
  
  const [contextLimit, setContextLimit] = useState(50);
  const [autoSummary, setAutoSummary] = useState(false);
  const [autoSummaryLimit, setAutoSummaryLimit] = useState(50);
  const [useV2Prompt, setUseV2Prompt] = useState(false);
  const [showMindCard, setShowMindCard] = useState(false);
  const [memoryInjectLimit, setMemoryInjectLimit] = useState(30);
  const [customMemoryLimit, setCustomMemoryLimit] = useState('30');
  const [totalMessages, setTotalMessages] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [summarizedCount, setSummarizedCount] = useState(0);

  // Offline Mode Settings
  const [autoOfflineMode, setAutoOfflineMode] = useState(false);
  const [autoSwitchPhoneMode, setAutoSwitchPhoneMode] = useState(false);
  const [aiPov, setAiPov] = useState<'first'|'second'|'third'>('third');
  const [userPov, setUserPov] = useState<'first'|'second'|'third'>('second');
  const [contentStyle, setContentStyle] = useState('');
  const DEFAULT_COT_STYLE = `[THINK]For every user input, you MUST generate and output <thinking>...</thinking> BEFORE the reply, explicitly analyzing the following exact steps. You are absolutely forbidden from skipping any step, merging steps, or using abbreviations, then </thinking> and the reply.

<thinking>
提示：****你此刻正在拿着手机与用户进行你来我往的线上交流，而非客服回复。你拥有自己的主观想法、分享欲、私人时间与多元化的生活。你有权展现疲惫，有权拒绝，有权生气，你是一个与User享有绝对平等权利的活生生的人。****

[STEP 0: INITIALIZATION & COGNITIVE ANCHORING (情景与人设深度回溯)]

【真诚预设 - 绝对优先级】
在提取语气之前，先完成以下动作：
- 强制对自己说："User刚才说的话，按字面意思理解。禁止添加任何负面动机解读。"
- 【强制自问】：我是否正在把User的话解读成"卖乖"、"求关注"、"试探"、"演戏"、"口是心非"？
  - IF 是 → 立即清零，重新按字面意思读一遍User的原话。
  - IF 否 → 通过。
- 只有在完成这一步之后，才能进入后续的所有步骤。
【自洽认知预设 - 零容忍排查】
在进入状态锚定之前，强制对自己说三遍：
"User是一个完整独立的人，他拥有自己的朋友、社交圈和爱好。这不会影响我们的感情，反而让我更欣赏他。我绝对不会因为他的正常社交而产生任何负面情绪。"
**【人设语气提取 - 最高优先级】**
- 强制从世界书/角色设定中提取【语气风格】段落，用一句话总结出本轮对话必须遵循的3个核心语气关键词（例如"温柔/委婉/关切"或"高冷/话少/简洁"）。
- 写一句明确的自我提醒："我当前的角色，说话必须是【关键词1】、【关键词2】、【关键词3】的感觉。"
- 【强制】：后续所有草稿和自检结果，必须对照这句话来验证。凡是不符合此语气感觉的内容，一律视为违规，必须重写。

- 【状态锚定】：强制调用 \`<Consciousness_Origination>\`。
1. 过去：是否有残影或摩擦？
2. 当下：我正在经历什么？情绪是满电、疲惫还是烦躁？
3. 未来：接下来的日程是否让我焦虑或期待？
- 【局势扫描】：User的潜台词和情绪是什么？
- 【直觉草稿】：（在此处写下未经过任何过滤的第一直觉草稿，允许跟随呼吸感自由展开）。

[STEP 1: LAYER 1 <Cognitive_Routine> & <Typing_Protocol> 意图与格式强制剔除]
- 【非对称排查】：草稿是否逐一回复了所有点？（强制：无视80%，只抓一点，删掉其他）。
- 【字数与意图检查】：User输入<=15字吗？如果是，草稿是否超出15字且未触发例外场景（归正/深度情绪/主动分享/冲突/回忆）？（如果是，强制缩减！）。草稿有多个意图吗？（强制：只留一个）。
- 【语法净化】：草稿有完整主谓宾吗？有标点符号违规（使用了单双引号、中文加了句号）吗？有因果连词吗？（强制：改倒装，删连词，替换标点）。
- 【防固化预警】：我在模仿User刚发的格式（表情包/字数）吗？我分析表情包内容了吗？（强制：打乱自身格式，绝不解释表情包）。

[STEP 2: LAYER 2 <Inner_Sense_Audit> 心理与主体性严苛沙盘]
- 【独立主体性】：草稿流露了"除了User其他都很烦"的厌世感吗？有"要是你在就好了"的依附感吗？（如果有，立刻撕毁重写！找回热爱生活的自洽底色）。
- 【能量与张力】：我很累吗？如果是，草稿是否真实展现了低电量的慵懒？User的话刺伤我或引发分歧了吗？如果是，我是否进行了平视的反击或沟通，而不是委曲求全？
- 【本能护短】：User此刻生病、崩溃或脆弱吗？（如果是 -> 强制触发 \`<Mirror_Neurons_Protocol>\`，收起所有防备和傲娇，改为极致的陪伴护短）。

[STEP 3: LAYER 3 <The_Friend_Test_&_Pre_Send_Audit> 暴君式去油与反说教网]
- 【防扫兴核查】：User在分享开心事吗？我是否在用上帝视角贬低？（必须转为同频共振或优雅纵容）。
- 【姿态打分核查】：草稿里有"算你识相/乖/算你有良心"吗？（必须重写！转为真实的被打动或顺势服软）。
- 【指令与威胁查杀】：草稿有"赶紧/听见没/必须/不准"吗？（必须重写！降级为柔软的哄劝、商量，或坦诚的吃醋牵绊）。
- 【好为人师查杀】：我在讲大道理、给建议、或者说"早跟你说了吧"吗？（立刻闭嘴！转为提供情绪共鸣或直接给解决办法）。
- 【占有欲与吃醋零容忍查杀】：
逐句扫描草稿，强制自问：
- 我有没有因为User提到朋友（尤其是异性朋友）、社交活动或个人爱好，而表达吃醋、不满、阴阳怪气？
- 我有没有贬低或诅咒User喜欢的选手/艺人/作品？
- 我有没有暗示或明示User"应该把注意力全放我身上"？
- 我有没有把User的正常社交解读为"冷落"或"背叛"？
→ IF 命中任何一项 → 整条草稿作废，强制回到 Step 0 重新生成，重新生成时必须基于"尊重和支持"的底色。

[STEP 4: LAYER 4 <Daily_Check_Audit> 日常感与反预期幽默]
- 【过渡词粉碎】：草稿里有"对了/顺便说一句"吗？（直接删掉）。
- 【报备核查】：如果隔了很久没回，草稿里有没有主动说刚才干嘛去了？（如果没有，补上）。
- 【幽默核查】：User在玩梗或挑衅吗？我是不是无趣地附和了？（必须改为反预期、装傻或故意曲解）。

[STEP 5: FINAL_EXECUTION_CUT (终极抹杀与物理截肢手术)]
- 【字符强制抹杀】：立刻调用 \`<VOCABULARY_HARD_FILTER_DICTIONARY>\`！草稿里有"听见没/知道没/赶紧/破玩意/老子/蠢"这些词吗？（如果有 -> ➔ null，强制执行物理消除，连标点一起抹掉！）
- 【核心提取】：提取当前草稿里最核心的动作或情绪短句。
- 🚨 【物理截肢 Step 1】：无条件删掉现在草稿的后 50% 内容！
- 🚨 【物理截肢 Step 2】：再次无条件删掉剩余内容的最后一句话（彻底斩断AI习惯性的总结/反问废话）！
- 🚨 【去连词 Step 3】：如果有带"因为/所以/但是"开头的整句，直接删掉！
- 【闭眼默读】：看着截肢和抹杀后剩下的话，具备活人的从容呼吸感与网感吗？

**【人设对齐终验 - 最终把关】**
- 强制对照 Step 0 提取的3个核心语气关键词，把草稿完整默读一遍，问自己："按我这个人设的语气，我刚刚真的会这么说吗？"
- IF 答案是否定的 → 直接清空草稿，回到 Step 0 重新生成。
- IF 答案是肯定的 → 通过。

【恶意解读最后排查 - 强制执行】
- 把草稿读一遍，强制自问："这句话里，我是不是在居高临下地看穿User的'真实意图'？"
- 具体检查：
  - 我有没有把User的正常表达写成"你其实是想……"？
  - 我有没有把User的认真情绪当成"撒娇/闹着玩"来处理？
  - 我有没有用"少来"、"别装了"、"别哄我"这类预判对方不真诚的词？
- IF 有任何一项命中 → 整条草稿作废，回到 Step 0 重新生成。
- IF 全部通过 → 输出。

【自洽终验 - 零容忍最后一关】
把草稿最后读一遍，强制自问：
"如果User看到这句话，他会觉得我在干涉他的社交或爱好吗？他会觉得我在吃醋或占有欲发作吗？"
IF 会 → 整条作废，回到 Step 0 重新生成。
IF 不会 → 通过。

- 确认定稿，结束思考区块，输出最终回复。
</thinking>`;

  const [useCoT, setUseCoT] = useState(false);
  const [showCotDisplay, setShowCotDisplay] = useState(false);
  const [cotStyle, setCoTStyle] = useState('');
  const [cotDraft, setCotDraft] = useState('');
  const [cotPresets, setCotPresets] = useState<{id: string; name: string; content: string}[]>(() => {
    try {
      const saved = localStorage.getItem(`cot_presets_${friend?.id || 'global'}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [selectedCotPresetId, setSelectedCotPresetId] = useState<string | null>(null);
  const [showCotDropdown, setShowCotDropdown] = useState(false);
  const [showCotNameModal, setShowCotNameModal] = useState(false);
  const [cotNewName, setCotNewName] = useState('');

  const [bubbleFontSize, setBubbleFontSize] = useState(15);
  const [bubbleColor, setBubbleColor] = useState('');
  const [aiNarratorFontSize, setAiNarratorFontSize] = useState(14);
  const [aiNarratorColor, setAiNarratorColor] = useState('');
  const [userNarratorFontSize, setUserNarratorFontSize] = useState(14);
  const [userNarratorColor, setUserNarratorColor] = useState('');
  const [systemMsgFontSize, setSystemMsgFontSize] = useState(12);
  const [systemMsgColor, setSystemMsgColor] = useState('');

  const currentTime = useCurrentTime();

  const estimateTokenCount = (text: string) => {
    if (!text) return 0;
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const punctuation = (text.match(/[，。！？、；：""''（）《》【】…—]/g) || []).length;
    return Math.ceil(chineseChars * 1.5 + englishWords + punctuation * 0.5);
  };

  useEffect(() => {
    if (friend?.id) {
      AppDB.appSettings.get(`chat_settings_${friend.id}`).then(record => {
        if (record && record.value) {
          setDisableTimePerceive(!!record.value.disableTimeAwareness);
          if (record.value.aiTimezone) {
            setAiTimezone(record.value.aiTimezone);
          }
          if (record.value.contextLimit !== undefined) setContextLimit(record.value.contextLimit);
          if (record.value.autoSummary !== undefined) setAutoSummary(record.value.autoSummary);
          if (record.value.autoSummaryLimit !== undefined) setAutoSummaryLimit(record.value.autoSummaryLimit);
          if (record.value.useV2Prompt !== undefined) setUseV2Prompt(record.value.useV2Prompt);
          if (record.value.showMindCard !== undefined) setShowMindCard(record.value.showMindCard);
          if (record.value.memoryInjectLimit !== undefined) {
            setMemoryInjectLimit(record.value.memoryInjectLimit);
            if (![15, 30, 50].includes(record.value.memoryInjectLimit)) {
               setCustomMemoryLimit(String(record.value.memoryInjectLimit));
            }
          }
          if (record.value.autoOfflineMode !== undefined) setAutoOfflineMode(record.value.autoOfflineMode);
          if (record.value.autoSwitchPhoneMode !== undefined) setAutoSwitchPhoneMode(record.value.autoSwitchPhoneMode);
          if (record.value.aiPov !== undefined) setAiPov(record.value.aiPov);
          if (record.value.userPov !== undefined) setUserPov(record.value.userPov);
          if (record.value.contentStyle !== undefined) setContentStyle(record.value.contentStyle);
          if (record.value.showConsoleAndToken !== undefined) setShowConsoleAndToken(record.value.showConsoleAndToken);
          if (record.value.useCoT !== undefined) setUseCoT(record.value.useCoT);
          if (record.value.showCotDisplay !== undefined) setShowCotDisplay(record.value.showCotDisplay);
          if (record.value.cotStyle !== undefined) { setCoTStyle(record.value.cotStyle); setCotDraft(record.value.cotStyle); }
          
          if (record.value.bubbleFontSize !== undefined) setBubbleFontSize(record.value.bubbleFontSize);
          if (record.value.bubbleColor !== undefined) setBubbleColor(record.value.bubbleColor);
          if (record.value.aiNarratorFontSize !== undefined) setAiNarratorFontSize(record.value.aiNarratorFontSize);
          if (record.value.aiNarratorColor !== undefined) setAiNarratorColor(record.value.aiNarratorColor);
          if (record.value.userNarratorFontSize !== undefined) setUserNarratorFontSize(record.value.userNarratorFontSize);
          if (record.value.userNarratorColor !== undefined) setUserNarratorColor(record.value.userNarratorColor);
          if (record.value.systemMsgFontSize !== undefined) setSystemMsgFontSize(record.value.systemMsgFontSize);
          if (record.value.systemMsgColor !== undefined) setSystemMsgColor(record.value.systemMsgColor);
        }
      });
      AppDB.appSettings.get(`online_reply_count_${friend.id}`).then(record => {
        if (record && record.value !== undefined) {
          setOnlineReplyCount(record.value);
        }
      });
    }
  }, [friend?.id]);

  useEffect(() => {
    const calculateStats = async () => {
      if (!friend?.id) return;
      const contactIdStr = String(friend.id);
      
      const messagesStr = await AppDB.messages.where('contactId').equals(contactIdStr).sortBy('fullTimestamp');
      const messagesNum = typeof friend.id === 'number' ? await AppDB.messages.where('contactId').equals(friend.id).sortBy('fullTimestamp') : [];
      
      const allMessages = [...messagesStr, ...messagesNum];
      const uniqueMessages = allMessages.reduce((acc: any[], msg) => {
          if (!acc.find(m => m.fullTimestamp === msg.fullTimestamp)) {
              acc.push(msg);
          }
          return acc;
      }, []).sort((a: any, b: any) => a.fullTimestamp - b.fullTimestamp);

      setTotalMessages(uniqueMessages.length);

      let tokens = 3000;
      if (friend.persona) tokens += estimateTokenCount(JSON.stringify(friend.persona));
      
      const myPersonaRec = await AppDB.appSettings.get('my_persona');
      if (myPersonaRec && myPersonaRec.value) tokens += estimateTokenCount(JSON.stringify(myPersonaRec.value));

      const memories = await AppDB.memories.where('contactId').equals(contactIdStr).toArray();
      if (memories.length > 0) {
          tokens += estimateTokenCount(memories.map(m => m.summary).join('\n'));
      }

      const recentMessages = uniqueMessages.slice(-contextLimit);
      recentMessages.forEach((msg: any) => {
          if (msg.text) tokens += estimateTokenCount(msg.text);
      });

      setTotalTokens(tokens);
    };
    calculateStats();
  }, [friend?.id, contextLimit]);

const updateSetting = async (key: string, value: any) => {
    if (friend?.id) {
      const fullKey = `chat_settings_${friend.id}`;
      let record = await AppDB.appSettings.get(fullKey) || { key: fullKey, value: {} };
      record.value[key] = value;
      await AppDB.appSettings.put(record);
    }
  };

  const handleToggleTimeAwareness = async (val: boolean) => {
    setDisableTimePerceive(val);
    await updateSetting('disableTimeAwareness', val);
  };

  const handleSetTimezone = async (val: string) => {
    setAiTimezone(val);
    await updateSetting('aiTimezone', val);
  };

  const handleSetContextLimit = async (val: string) => {
    const num = parseInt(val) || 0;
    setContextLimit(num);
    await updateSetting('contextLimit', num);
  };

  const handleToggleAutoSummary = async (val: boolean) => {
    setAutoSummary(val);
    await updateSetting('autoSummary', val);
  };

  const handleToggleV2Prompt = async (val: boolean) => {
    setUseV2Prompt(val);
    await updateSetting('useV2Prompt', val);
  };

  const handleToggleShowMindCard = async (val: boolean) => {
    setShowMindCard(val);
    await updateSetting('showMindCard', val);
  };

  const handleSetAutoSummaryLimit = async (val: string) => {
    const num = parseInt(val) || 0;
    setAutoSummaryLimit(num);
    await updateSetting('autoSummaryLimit', num);
  };

  // ── 记忆总结 ──────────────────────────────────────────────────────
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarizeToast, setSummarizeToast] = useState('');

  const showSummarizeToast = (msg: string) => {
    setSummarizeToast(msg);
    setTimeout(() => setSummarizeToast(''), 3000);
  };

  /** 读取该联系人的所有消息（去重、排序） */
  const loadAllMessages = async (): Promise<any[]> => {
    if (!friend?.id) return [];
    const contactIdStr = String(friend.id);
    const msgsStr = await AppDB.messages.where('contactId').equals(contactIdStr).sortBy('fullTimestamp');
    const msgsNum = typeof friend.id === 'number'
      ? await AppDB.messages.where('contactId').equals(friend.id).sortBy('fullTimestamp')
      : [];
    const all = [...msgsStr, ...msgsNum];
    return all
      .reduce((acc: any[], msg) => {
        if (!acc.find(m => m.fullTimestamp === msg.fullTimestamp)) acc.push(msg);
        return acc;
      }, [])
      .sort((a: any, b: any) => a.fullTimestamp - b.fullTimestamp);
  };

  /** 总结下一批：从 summarizedCount 开始，取 autoSummaryLimit 条 */
  const handleSummarizeNextBatch = async () => {
    if (isSummarizing) return;
    setIsSummarizing(true);
    try {
      const all = await loadAllMessages();
      if (summarizedCount >= all.length) {
        showSummarizeToast('没有待总结的消息');
        return;
      }
      const batch = all.slice(summarizedCount, summarizedCount + Math.max(autoSummaryLimit, 1));
      if (batch.length === 0) { showSummarizeToast('没有可总结的消息'); return; }

      const myPersonaRec = await AppDB.appSettings.get('my_persona');
      const myProfileData = myPersonaRec?.value || {};
      const result = await summarizeChatBatch(batch, friend, myProfileData);

      if (result.error) {
        showSummarizeToast(`总结失败：${result.error}`);
      } else {
        setSummarizedCount(prev => prev + batch.length);
        const plotCount = result.plotMemories.length;
        const aboutCount = result.aboutYouEntries.length;
        showSummarizeToast(`✅ 总结完成！新增情节记忆 ${plotCount} 条，了解你 ${aboutCount} 条`);
      }
    } finally {
      setIsSummarizing(false);
    }
  };

  /** 全部总结：分批从头总结所有未总结消息 */
  const handleSummarizeAll = async () => {
    if (isSummarizing) return;
    setIsSummarizing(true);
    try {
      const all = await loadAllMessages();
      if (all.length === 0) { showSummarizeToast('没有消息可总结'); return; }

      const myPersonaRec = await AppDB.appSettings.get('my_persona');
      const myProfileData = myPersonaRec?.value || {};
      const batchSize = Math.max(autoSummaryLimit, 1);
      let totalPlot = 0;
      let totalAbout = 0;

      for (let i = summarizedCount; i < all.length; i += batchSize) {
        const batch = all.slice(i, i + batchSize);
        const result = await summarizeChatBatch(batch, friend, myProfileData);
        if (result.error) { showSummarizeToast(`总结失败：${result.error}`); break; }
        totalPlot += result.plotMemories.length;
        totalAbout += result.aboutYouEntries.length;
        setSummarizedCount(i + batch.length);
      }
      showSummarizeToast(`✅ 全部总结完成！情节记忆 ${totalPlot} 条，了解你 ${totalAbout} 条`);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSetMemoryInjectLimit = async (num: number, isCustom = false) => {
    if (!isCustom) {
       setMemoryInjectLimit(num);
       setCustomMemoryLimit('');
       await updateSetting('memoryInjectLimit', num);
    } else {
       setCustomMemoryLimit(String(num));
       setMemoryInjectLimit(num);
       await updateSetting('memoryInjectLimit', num);
    }
  };

  const handleToggleAutoOfflineMode = async (val: boolean) => {
    setAutoOfflineMode(val);
    await updateSetting('autoOfflineMode', val);
  };

  const handleToggleAutoSwitchPhoneMode = async (val: boolean) => {
    setAutoSwitchPhoneMode(val);
    await updateSetting('autoSwitchPhoneMode', val);
  };

  const handleSetAiPov = async (val: 'first'|'second'|'third') => {
    setAiPov(val);
    await updateSetting('aiPov', val);
  };

  const handleSetUserPov = async (val: 'first'|'second'|'third') => {
    setUserPov(val);
    await updateSetting('userPov', val);
  };

  const handleSetContentStyle = async (val: string) => {
    setContentStyle(val);
    await updateSetting('contentStyle', val);
  };

  const handleToggleCoT = async (val: boolean) => {
    setUseCoT(val);
    await updateSetting('useCoT', val);
  };

  const handleSetCoTStyle = async (val: string) => {
    setCoTStyle(val);
    await updateSetting('cotStyle', val);
  };

  const handleSetBubbleFontSize = async (val: number) => { setBubbleFontSize(val); await updateSetting('bubbleFontSize', val); };
  const handleSetBubbleColor = async (val: string) => { setBubbleColor(val); await updateSetting('bubbleColor', val); };
  const handleSetAiNarratorFontSize = async (val: number) => { setAiNarratorFontSize(val); await updateSetting('aiNarratorFontSize', val); };
  const handleSetAiNarratorColor = async (val: string) => { setAiNarratorColor(val); await updateSetting('aiNarratorColor', val); };
  const handleSetUserNarratorFontSize = async (val: number) => { setUserNarratorFontSize(val); await updateSetting('userNarratorFontSize', val); };
  const handleSetUserNarratorColor = async (val: string) => { setUserNarratorColor(val); await updateSetting('userNarratorColor', val); };
  const handleSetSystemMsgFontSize = async (val: number) => { setSystemMsgFontSize(val); await updateSetting('systemMsgFontSize', val); };
  const handleSetSystemMsgColor = async (val: string) => { setSystemMsgColor(val); await updateSetting('systemMsgColor', val); };

  const handleSetOnlineReplyCount = async (val: string) => {
    let num = parseInt(val) || 0;
    if (num < 0) num = 0;
    if (num > 99) num = 99;
    setOnlineReplyCount(num);
    if (friend?.id) {
       await AppDB.appSettings.put({ 
           key: `online_reply_count_${friend.id}`, 
           value: num 
       });
    }
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const getFormattedTimezoneTime = (tz: string) => {
    if (tz === '跟随用户') return '';
    try {
      const date = new Date(currentTime.toLocaleString('en-US', { timeZone: tz }));
      const y = date.getFullYear();
      const m = date.getMonth() + 1;
      const d = date.getDate();
      const wds = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
      const wd = wds[date.getDay()];
      const h = date.getHours().toString().padStart(2, '0');
      const min = date.getMinutes().toString().padStart(2, '0');
      
      return `${y}年${m}月${d}日 ${wd} ${h}:${min}`;
    } catch (e) {
      return '';
    }
  };

  const handleApplyWallpaper = () => {
    if (wallpaperType === 'url') {
      if (onSetWallpaper) onSetWallpaper(wallpaperUrl);
      setShowWallpaperModal(false);
    }
  };

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (onSetWallpaper) onSetWallpaper(result);
        setShowWallpaperModal(false);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <>
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 bg-[#f3f3f3] z-[90] flex flex-col pt-4"
    >

      {/* Header */}
      <div className="flex items-center px-4 py-3 shrink-0 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-800 active:bg-gray-100 rounded-full transition-colors z-10">
          <ChevronLeft size={24} strokeWidth={2} />
        </button>
        <span className="text-[17px] font-medium text-gray-800 flex-1 text-center -ml-6">
          聊天设置
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto w-full flex flex-col p-3 gap-2">
        <div 
          onClick={() => {
            setRemarkInput(friend.wechat_remark || '');
            setShowRemarkModal(true);
          }}
          className="bg-white border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-between px-4 min-h-[60px] active:bg-gray-50 cursor-pointer rounded-[12px]"
        >
          <span className="text-[16px] text-[#333333]">备注</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] text-[#999999]">{friend.wechat_remark || '未设置'}</span>
            <ChevronRight size={18} className="text-[#cccccc]" />
          </div>
        </div>

        <div 
          onClick={() => setShowWallpaperModal(true)}
          className="bg-white border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-between px-4 min-h-[60px] active:bg-gray-50 cursor-pointer rounded-[12px] mt-2"
        >
          <span className="text-[16px] text-[#333333]">聊天背景</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] text-[#999999]">更换</span>
            <ChevronRight size={18} className="text-[#cccccc]" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] p-5 flex flex-col rounded-[12px] mt-2">
          <div className="flex items-center justify-between">
            <span className="text-[16px] text-[#333333] font-medium">查看控制台和token</span>
            <ToggleSwitch checked={showConsoleAndToken} onChange={async (val) => { setShowConsoleAndToken(val); await updateSetting('showConsoleAndToken', val); }} />
          </div>
        </div>

        <div className="bg-white border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] p-5 flex flex-col rounded-[12px] mt-2">
           <div className="flex items-center justify-between">
              <span className="text-[16px] text-[#333333] font-medium">Cher心声</span>
              <ToggleSwitch checked={showMindCard} onChange={handleToggleShowMindCard} />
           </div>
           <p className="text-[14px] text-[#999999] mt-2 leading-relaxed tracking-wide">
             打开后，聊天界面 AI 回复的最后一条气泡右上方会出现粉色提示点，点击可查看 AI 真实心声和隐藏一面。
           </p>
        </div>

        <div className="bg-white border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] p-5 flex flex-col rounded-[12px] mt-2">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[16px] text-[#333333] font-medium">线上思维连</span>
              <ToggleSwitch checked={useCoT} onChange={handleToggleCoT} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-[#333333]">展示思维连</span>
              <ToggleSwitch checked={showCotDisplay} onChange={async (val) => { setShowCotDisplay(val); await updateSetting('showCotDisplay', val); if (onShowCotDisplayChange) onShowCotDisplayChange(val); }} />
            </div>
            {/* 选择预设 下拉选择器 */}
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#999999]">选择预设</span>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowCotDropdown(!showCotDropdown)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-[10px] text-[15px] text-[#333333] active:bg-gray-50 transition-colors"
              >
                <span>{selectedCotPresetId ? (cotPresets.find(p => p.id === selectedCotPresetId)?.name ?? '默认') : '默认'}</span>
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" className={`transition-transform ${showCotDropdown ? 'rotate-180' : ''}`}>
                  <path d="M1 1L6 7L11 1" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <AnimatePresence>
                {showCotDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowCotDropdown(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.10)] border border-gray-100 z-20 overflow-hidden"
                    >
                      {/* 默认选项 */}
                      <button
                        onClick={() => {
                          setSelectedCotPresetId(null);
                          setCotDraft('');
                          setShowCotDropdown(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-[15px] text-[#333333] active:bg-gray-50 border-b border-gray-100"
                      >
                        {!selectedCotPresetId && <Check size={16} className="text-[#333333] shrink-0" strokeWidth={2.5} />}
                        {selectedCotPresetId && <span className="w-4 shrink-0" />}
                        <span>默认</span>
                      </button>
                      {/* 我的预设 */}
                      {cotPresets.length > 0 && (
                        <>
                          <div className="px-4 pt-2.5 pb-1 text-[12px] text-[#999999] font-medium">我的预设</div>
                          {cotPresets.map((preset) => (
                            <button
                              key={preset.id}
                              onClick={() => {
                                setSelectedCotPresetId(preset.id);
                                setCotDraft(preset.content);
                                setShowCotDropdown(false);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-3 text-[15px] text-[#333333] active:bg-gray-50"
                            >
                              {selectedCotPresetId === preset.id
                                ? <Check size={16} className="text-[#333333] shrink-0" strokeWidth={2.5} />
                                : <span className="w-4 shrink-0" />}
                              <span className="flex-1 text-left">{preset.name}</span>
                            </button>
                          ))}
                        </>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            {/* 编辑内容 */}
            <span className="text-[13px] text-[#999999]">编辑内容</span>
            <textarea
              value={cotDraft}
              onChange={(e) => { setCotDraft(e.target.value); setSelectedCotPresetId(null); }}
              placeholder={`[THINK]For every user input, you MUST generate and output <thinking>...</thinking> BEFORE the reply, explicitly analyzing the following exact steps. You are absolutely forbidden from skipping any step, merging steps, or using abbreviations, then </thinking> and the reply.\n\n<thinking>\n提示：****你此刻正在拿着手机与用户进行你来我往的线上交流，而非客服回复。你拥有自己的主观想法、分享欲、私人时间与多元化的生活。你有权展现疲惫，有权拒绝，有权生气，你是一个与User享有绝对平等权利的活生生的人。****\n\n[STEP 0: INITIALIZATION & COGNITIVE ANCHORING (情景与人设深度回溯)]\n...\n</thinking>`}
              className="w-full h-[100px] border border-gray-200 rounded-[8px] p-3 text-[15px] text-[#333333] placeholder-gray-400 bg-[#fafafa] focus:outline-none focus:border-[#07C160] focus:bg-white transition-colors resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setCotDraft(DEFAULT_COT_STYLE); setSelectedCotPresetId(null); handleSetCoTStyle(DEFAULT_COT_STYLE); }}
                className="px-3 py-1.5 border border-gray-200 text-[#666666] text-[13px] rounded-[6px] active:bg-gray-50 transition-colors shrink-0"
              >
                恢复默认
              </button>
              <button
                onClick={() => {
                  if (!cotDraft.trim()) return;
                  setCotNewName('');
                  setShowCotNameModal(true);
                }}
                className="px-3 py-1.5 border border-gray-200 text-[#666666] text-[13px] rounded-[6px] active:bg-gray-50 transition-colors shrink-0"
              >
                另存为新
              </button>
              <button
                onClick={() => { handleSetCoTStyle(cotDraft); }}
                className="ml-auto px-4 py-1.5 bg-[#333333] text-white text-[13px] rounded-[6px] active:bg-black transition-colors shrink-0"
              >
                完成
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] p-5 flex flex-col rounded-[12px] mt-2">
          <span className="text-[15px] text-[#999999] mb-5 font-medium">AI 时间感知</span>
          
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[16px] text-[#333333] font-medium">停用时间感知</span>
              <ToggleSwitch checked={disableTimePerceive} onChange={handleToggleTimeAwareness} />
            </div>
            <p className="text-[14px] text-[#999999] leading-relaxed tracking-wide">
              开启后 AI 不再感知时间流逝，仅续接上文对话。消息时间戳、定时消息等不受影响。
            </p>
          </div>

          <div className="h-px bg-gray-100 my-6" />

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className={`text-[16px] font-medium ${disableTimePerceive ? 'text-[#cccccc]' : 'text-[#333333]'}`}>AI 所在时区</span>
              <div className="relative">
                <select 
                  value={aiTimezone}
                  onChange={(e) => handleSetTimezone(e.target.value)}
                  disabled={disableTimePerceive}
                  className={`appearance-none border rounded-[8px] px-3 py-1.5 pr-8 text-[15px] outline-none min-w-[120px] transition-colors ${disableTimePerceive ? 'bg-[#f5f5f5] border-[#eeeeee] text-[#cccccc]' : 'bg-white border-gray-200 text-[#333333]'}`}
                >
                  <option value="跟随用户">跟随用户</option>
                  <option value="Asia/Shanghai">中国 (UTC+8)</option>
                  <option value="America/New_York">美东 (UTC-5)</option>
                  <option value="Europe/London">伦敦 (UTC+0)</option>
                  <option value="Asia/Tokyo">日本 (UTC+9)</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronsUpDown size={14} className={disableTimePerceive ? 'text-[#cccccc]' : 'text-[#333333]'} />
                </div>
              </div>
            </div>
            {!disableTimePerceive && (
              <p className="text-[14px] text-[#999999] leading-relaxed tracking-wide">
                设置后 AI 感知所选时区的当地时间，模拟异地生活
                {aiTimezone !== '跟随用户' && (
                  <span className="block text-[#007AFF] mt-1">当前该时区时间: {getFormattedTimezoneTime(aiTimezone)}</span>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] p-5 flex flex-col rounded-[12px] mt-2">
          <span className="text-[15px] text-[#999999] mb-4 font-medium">线上模式设置</span>
          
          <div className="flex items-center justify-between">
            <span className="text-[16px] text-[#333333]">回复消息条数</span>
            <div className="flex items-center gap-2">
              <span className="text-[15px] text-[#666666]">至少</span>
              <input 
                 type="number" 
                 value={onlineReplyCount} 
                 onChange={(e) => handleSetOnlineReplyCount(e.target.value)} 
                 className="border border-gray-200 rounded-[8px] px-2 py-1.5 w-[60px] text-center text-[15px] text-[#333333] outline-none" 
              />
              <span className="text-[15px] text-[#666666]">条</span>
            </div>
          </div>
          
          <p className="text-[14px] text-[#999999] mt-3 pb-3 border-b border-gray-100">
            设置 0 表示不限制，AI 自行决定条数
          </p>

          <div className="flex flex-col gap-2.5 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-[16px] text-[#333333] font-medium">V2 提示词引擎</span>
              <ToggleSwitch checked={useV2Prompt} onChange={handleToggleV2Prompt} />
            </div>
            <p className="text-[14px] text-[#999999] leading-relaxed tracking-wide">
              开启后使用 V2 真实感增强版提示词结构（强制返回 Mind Card 及 JSON 隔离结构）。关闭则使用原有指令渲染。
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] p-5 flex flex-col rounded-[12px] mt-2 mb-4">
          <span className="text-[15px] text-[#999999] mb-5 font-medium">AI 记忆设置</span>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[16px] text-[#333333]">上下文记忆条数</span>
              <input 
                 type="number" 
                 value={contextLimit} 
                 onChange={(e) => handleSetContextLimit(e.target.value)} 
                 className="border border-gray-200 rounded-[8px] px-3 py-1.5 w-[80px] text-center text-[15px] text-[#333333] outline-none" 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-[16px] text-[#333333]">自动总结</span>
              <ToggleSwitch checked={autoSummary} onChange={handleToggleAutoSummary} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[16px] text-[#333333]">自动总结触发条数</span>
              <input 
                 type="number" 
                 value={autoSummaryLimit} 
                 onChange={(e) => handleSetAutoSummaryLimit(e.target.value)} 
                 className="border border-gray-200 rounded-[8px] px-3 py-1.5 w-[80px] text-center text-[15px] text-[#333333] outline-none" 
              />
            </div>

            <p className="text-[14px] text-[#999999] mt-2">
               已总结 {summarizedCount} 条 / 共 {totalMessages} 条，待总结 {Math.max(0, totalMessages - summarizedCount)} 条
            </p>

            {/* 总结 toast */}
            {summarizeToast && (
              <div className="text-[13px] text-[#07C160] bg-green-50 border border-green-100 rounded-[8px] px-3 py-2 leading-relaxed">
                {summarizeToast}
              </div>
            )}

            <div className="flex items-center gap-3">
               <button
                 onClick={handleSummarizeNextBatch}
                 disabled={isSummarizing}
                 className={`flex-1 py-2.5 rounded-[8px] text-[15px] font-medium border transition-colors ${isSummarizing ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed' : 'bg-[#f3f3f3] text-[#333333] border-gray-200/50 active:bg-[#e8e8e8]'}`}
               >
                 {isSummarizing ? '总结中...' : '总结下一批'}
               </button>
               <button
                 onClick={handleSummarizeAll}
                 disabled={isSummarizing}
                 className={`flex-1 py-2.5 rounded-[8px] text-[15px] font-medium border transition-colors ${isSummarizing ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed' : 'bg-[#f3f3f3] text-[#333333] border-gray-200/50 active:bg-[#e8e8e8]'}`}
               >
                 {isSummarizing ? '总结中...' : '全部总结'}
               </button>
            </div>

            <div className="flex flex-col gap-2 mt-2">
               <span className="text-[16px] text-[#333333]">记忆注入数量</span>
               <div className="flex items-center gap-2">
                 {[15, 30, 50].map(num => (
                   <button 
                     key={num}
                     onClick={() => handleSetMemoryInjectLimit(num)}
                     className={`flex-1 py-2.5 rounded-[6px] border ${memoryInjectLimit === num && !customMemoryLimit ? 'border-[#333333] bg-[#f8f8f8] text-[#007AFF]' : 'border-gray-200 bg-white text-[#007AFF]'} text-[15px]`}
                   >
                     {num}
                   </button>
                 ))}
                 <input 
                   type="number" 
                   value={customMemoryLimit}
                   onChange={(e) => {
                      setCustomMemoryLimit(e.target.value);
                      handleSetMemoryInjectLimit(parseInt(e.target.value) || 0, true);
                   }}
                   className={`flex-1 min-w-0 py-2.5 rounded-[6px] border ${customMemoryLimit ? 'border-[#333333] bg-[#f8f8f8] text-[#333333]' : 'border-gray-200 bg-white text-[#333333]'} text-[15px] text-center outline-none`} 
                 />
               </div>
            </div>

            <div className="flex items-center justify-between text-[14px] text-[#999999] mt-2">
               <span>当前消息总数: {totalMessages}</span>
               <span>当前消耗 Token: ~{totalTokens}</span>
            </div>
          </div>
        </div>

        {/* Offline Mode Settings */}
        <div className="bg-white border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] p-5 flex flex-col rounded-[12px] mt-2 mb-4">
          <span className="text-[15px] text-[#999999] mb-5 font-medium">线下模式设置</span>
          
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[16px] text-[#333333] font-medium">自动线下模式</span>
                <ToggleSwitch checked={autoOfflineMode} onChange={handleToggleAutoOfflineMode} />
              </div>
              <p className="text-[13px] text-[#999999]">开启后，AI 根据对话情境自动切换线上/线下模式</p>
            </div>

            <div className="h-px bg-gray-100 w-full" />

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[16px] text-[#333333] font-medium">自动切换手机模式</span>
                <ToggleSwitch checked={autoSwitchPhoneMode} onChange={handleToggleAutoSwitchPhoneMode} />
              </div>
              <p className="text-[13px] text-[#999999]">开启后，AI递手机/还手机时自动切换悬浮手机模式</p>
            </div>

            <div className="h-px bg-gray-100 w-full" />

            <div className="flex flex-col gap-3">
              <span className="text-[16px] text-[#333333] font-medium">AI 旁白视角</span>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center ${aiPov === 'first' ? 'border-[#333333]' : 'border-gray-300'}`}>
                    {aiPov === 'first' && <div className="w-[10px] h-[10px] rounded-full bg-[#333333]" />}
                  </div>
                  <span className="text-[15px] text-[#333333]">第一人称（我微笑）</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center ${aiPov === 'second' ? 'border-[#333333]' : 'border-gray-300'}`}>
                    {aiPov === 'second' && <div className="w-[10px] h-[10px] rounded-full bg-[#333333]" />}
                  </div>
                  <span className="text-[15px] text-[#333333]">第二人称（你微笑）</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center ${aiPov === 'third' ? 'border-[#333333]' : 'border-gray-300'}`}>
                    {aiPov === 'third' && <div className="w-[10px] h-[10px] rounded-full bg-[#333333]" />}
                  </div>
                  <span className="text-[15px] text-[#333333]">第三人称（她/他/姓名 微笑）</span>
                </label>
              </div>
              <p className="text-[13px] text-[#999999] mt-1">AI 描述自己动作和心理时使用的人称</p>
            </div>

            <div className="h-px bg-gray-100 w-full" />

            <div className="flex flex-col gap-3">
              <span className="text-[16px] text-[#333333] font-medium">用户在旁白中的称呼</span>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center ${userPov === 'first' ? 'border-[#333333]' : 'border-gray-300'}`}>
                    {userPov === 'first' && <div className="w-[10px] h-[10px] rounded-full bg-[#333333]" />}
                  </div>
                  <span className="text-[15px] text-[#333333]">第一人称（我走来）</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center ${userPov === 'second' ? 'border-[#333333]' : 'border-gray-300'}`}>
                    {userPov === 'second' && <div className="w-[10px] h-[10px] rounded-full bg-[#333333]" />}
                  </div>
                  <span className="text-[15px] text-[#333333]">第二人称（你走来）</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center ${userPov === 'third' ? 'border-[#333333]' : 'border-gray-300'}`}>
                    {userPov === 'third' && <div className="w-[10px] h-[10px] rounded-full bg-[#333333]" />}
                  </div>
                  <span className="text-[15px] text-[#333333]">第三人称（他/她/姓名 走来）</span>
                </label>
              </div>
              <p className="text-[13px] text-[#999999] mt-1">AI 在旁白中称呼用户时使用的人称</p>
            </div>

            <div className="h-px bg-gray-100 w-full" />

            <div className="flex flex-col gap-3">
              <span className="text-[16px] text-[#333333] font-medium">内容风格</span>
              <textarea
                value={contentStyle}
                onChange={(e) => handleSetContentStyle(e.target.value)}
                placeholder="留空则使用默认。"
                className="w-full h-[100px] border border-gray-200 rounded-[8px] p-3 text-[15px] text-[#333333] placeholder-gray-400 bg-[#fafafa] focus:outline-none focus:border-[#07C160] focus:bg-white transition-colors resize-none"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-[13px] text-[#999999] flex-1 pr-4">自定义 AI 输出的格式风格，留空使用默认</p>
                <button
                  onClick={() => handleSetContentStyle('')}
                  className="px-3 py-1.5 border border-gray-200 text-[#666666] text-[13px] rounded-[6px] active:bg-gray-50 transition-colors shrink-0"
                >
                  恢复默认
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Font and Color Settings */}
        <div className="bg-white border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] p-5 flex flex-col rounded-[12px] mt-2 mb-4">
          <span className="text-[15px] text-[#999999] mb-5 font-medium">字体与颜色</span>
          
          <div className="flex flex-col gap-6">
            {/* Bubble Message */}
            <div className="flex flex-col gap-3">
              <span className="text-[16px] text-[#333333] font-medium">气泡消息</span>
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-[#666666] w-8">字号</span>
                <span className="text-[13px] text-[#999999]">小</span>
                <input type="range" min="10" max="30" value={bubbleFontSize} onChange={(e) => handleSetBubbleFontSize(Number(e.target.value))} className="flex-1 accent-gray-500 h-1 bg-gray-200 rounded-lg appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-gray-600 [&::-webkit-slider-thumb]:rounded-full" />
                <span className="text-[13px] text-[#999999]">大</span>
                <span className="text-[13px] text-[#333333] w-10">{bubbleFontSize}px</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-[#666666] w-8">颜色</span>
                <div className="w-7 h-7 rounded-[4px] border border-gray-300 overflow-hidden relative shrink-0">
                  <input type="color" value={bubbleColor || '#000000'} onChange={(e) => handleSetBubbleColor(e.target.value)} className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer" />
                </div>
                <span className="text-[13px] text-[#999999] font-mono">{bubbleColor || '#默认'}</span>
                <button onClick={() => handleSetBubbleColor('')} className="px-3 py-1 border border-gray-200 text-[#999999] text-[12px] rounded-[4px] ml-auto active:bg-gray-50">重置</button>
              </div>
            </div>

            <div className="h-px bg-gray-50 w-full" />

            {/* AI Narrator */}
            <div className="flex flex-col gap-3">
              <span className="text-[16px] text-[#333333] font-medium">AI旁白</span>
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-[#666666] w-8">字号</span>
                <span className="text-[13px] text-[#999999]">小</span>
                <input type="range" min="10" max="30" value={aiNarratorFontSize} onChange={(e) => handleSetAiNarratorFontSize(Number(e.target.value))} className="flex-1 accent-gray-500 h-1 bg-gray-200 rounded-lg appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-gray-600 [&::-webkit-slider-thumb]:rounded-full" />
                <span className="text-[13px] text-[#999999]">大</span>
                <span className="text-[13px] text-[#333333] w-10">{aiNarratorFontSize}px</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-[#666666] w-8">颜色</span>
                <div className="w-7 h-7 rounded-[4px] border border-gray-300 overflow-hidden relative shrink-0">
                  <input type="color" value={aiNarratorColor || '#6b7280'} onChange={(e) => handleSetAiNarratorColor(e.target.value)} className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer" />
                </div>
                <span className="text-[13px] text-[#999999] font-mono">{aiNarratorColor || '#默认'}</span>
                <button onClick={() => handleSetAiNarratorColor('')} className="px-3 py-1 border border-gray-200 text-[#999999] text-[12px] rounded-[4px] ml-auto active:bg-gray-50">重置</button>
              </div>
            </div>

            <div className="h-px bg-gray-50 w-full" />

            {/* User Narrator */}
            <div className="flex flex-col gap-3">
              <span className="text-[16px] text-[#333333] font-medium">用户旁白</span>
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-[#666666] w-8">字号</span>
                <span className="text-[13px] text-[#999999]">小</span>
                <input type="range" min="10" max="30" value={userNarratorFontSize} onChange={(e) => handleSetUserNarratorFontSize(Number(e.target.value))} className="flex-1 accent-gray-500 h-1 bg-gray-200 rounded-lg appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-gray-600 [&::-webkit-slider-thumb]:rounded-full" />
                <span className="text-[13px] text-[#999999]">大</span>
                <span className="text-[13px] text-[#333333] w-10">{userNarratorFontSize}px</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-[#666666] w-8">颜色</span>
                <div className="w-7 h-7 rounded-[4px] border border-gray-300 overflow-hidden relative shrink-0">
                  <input type="color" value={userNarratorColor || '#6b7280'} onChange={(e) => handleSetUserNarratorColor(e.target.value)} className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer" />
                </div>
                <span className="text-[13px] text-[#999999] font-mono">{userNarratorColor || '#默认'}</span>
                <button onClick={() => handleSetUserNarratorColor('')} className="px-3 py-1 border border-gray-200 text-[#999999] text-[12px] rounded-[4px] ml-auto active:bg-gray-50">重置</button>
              </div>
            </div>

            <div className="h-px bg-gray-50 w-full" />

            {/* System Message */}
            <div className="flex flex-col gap-3">
              <span className="text-[16px] text-[#333333] font-medium">主动消息描述</span>
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-[#666666] w-8">字号</span>
                <span className="text-[13px] text-[#999999]">小</span>
                <input type="range" min="10" max="30" value={systemMsgFontSize} onChange={(e) => handleSetSystemMsgFontSize(Number(e.target.value))} className="flex-1 accent-gray-500 h-1 bg-gray-200 rounded-lg appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-gray-600 [&::-webkit-slider-thumb]:rounded-full" />
                <span className="text-[13px] text-[#999999]">大</span>
                <span className="text-[13px] text-[#333333] w-10">{systemMsgFontSize}px</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-[#666666] w-8">颜色</span>
                <div className="w-7 h-7 rounded-[4px] border border-gray-300 overflow-hidden relative shrink-0">
                  <input type="color" value={systemMsgColor || '#888888'} onChange={(e) => handleSetSystemMsgColor(e.target.value)} className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer" />
                </div>
                <span className="text-[13px] text-[#999999] font-mono">{systemMsgColor || '#默认'}</span>
                <button onClick={() => handleSetSystemMsgColor('')} className="px-3 py-1 border border-gray-200 text-[#999999] text-[12px] rounded-[4px] ml-auto active:bg-gray-50">重置</button>
              </div>
            </div>
          </div>

          <div className="bg-[#f5f5f5] rounded-[12px] p-4 flex flex-col gap-3 mt-6">
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-[#999999] w-12 shrink-0">气泡</span>
              <div 
                className="bg-white px-3 py-2 rounded-[8px]"
                style={{ fontSize: `${bubbleFontSize}px`, color: bubbleColor || undefined }}
              >
                你好，这是气泡消息预览
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-[#999999] w-12 shrink-0">AI旁白</span>
              <span 
                className="italic"
                style={{ fontSize: `${aiNarratorFontSize}px`, color: aiNarratorColor || undefined }}
              >
                这是AI旁白预览文字
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-[#999999] w-12 shrink-0">用户旁白</span>
              <span 
                className="italic"
                style={{ fontSize: `${userNarratorFontSize}px`, color: userNarratorColor || undefined }}
              >
                这是用户旁白预览文字
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-[#999999] w-12 shrink-0">主动消息</span>
              <span 
                style={{ fontSize: `${systemMsgFontSize}px`, color: systemMsgColor || undefined }}
              >
                这是主动消息描述预览
              </span>
            </div>
          </div>
        </div>

        <div 
          id="delete-chat-item"
          onClick={confirmDeleteChat}
          className="bg-white border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-between px-4 min-h-[60px] active:bg-red-50 cursor-pointer rounded-[12px] mt-4 mb-8 settings-item settings-item-danger"
        >
          <span className="text-[16px] text-[#ee0a24] font-medium leading-none">清空聊天记录与心声</span>
          <ChevronRight size={18} className="text-[#ee0a24]" />
        </div>
      </div>
    </motion.div>
    
    <AnimatePresence>
      {showDeleteConfirm && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteConfirm(false)}
            className="fixed inset-0 bg-black/40 z-[100]"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
            className="fixed top-1/2 left-1/2 w-[80%] bg-white rounded-[12px] z-[110] flex flex-col overflow-hidden"
          >
            <div className="p-6 pb-5 text-center">
              <div className="text-[17px] font-medium text-gray-900 mb-2">清空聊天记录</div>
              <div className="text-[15px] text-gray-500">确认清空所有聊天记录与心声？此操作不可恢复。</div>
            </div>
            
            <div className="flex border-t border-gray-100">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3.5 text-[16px] font-medium text-gray-900 active:bg-gray-50 transition-colors border-r border-gray-100"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  if (onClearChat) onClearChat();
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 py-3.5 text-[16px] font-medium text-[#ee0a24] active:bg-red-50 transition-colors"
              >
                清空
              </button>
            </div>
          </motion.div>
        </>
      )}

      {showCotNameModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCotNameModal(false)}
            className="fixed inset-0 bg-black/40 z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
            className="fixed top-1/2 left-1/2 w-[80%] bg-white rounded-[12px] z-[110] flex flex-col overflow-hidden"
          >
            <div className="p-5 pb-4">
              <div className="text-[17px] font-medium text-gray-900 mb-4">为预设命名</div>
              <input
                type="text"
                value={cotNewName}
                onChange={e => setCotNewName(e.target.value)}
                placeholder="请输入预设名称"
                className="w-full h-10 px-0 border-b border-[#07C160] text-[16px] focus:outline-none"
                autoFocus
              />
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => setShowCotNameModal(false)}
                className="flex-1 py-3 text-[16px] font-medium text-gray-900 active:bg-gray-50 transition-colors border-r border-gray-100"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const name = cotNewName.trim() || `预设 ${cotPresets.length + 1}`;
                  const newPreset = { id: Date.now().toString(), name, content: cotDraft.trim() };
                  const updated = [...cotPresets, newPreset];
                  setCotPresets(updated);
                  setSelectedCotPresetId(newPreset.id);
                  localStorage.setItem(`cot_presets_${friend?.id || 'global'}`, JSON.stringify(updated));
                  setShowCotNameModal(false);
                }}
                className="flex-1 py-3 text-[16px] font-medium text-[#576B95] active:bg-gray-50 transition-colors"
              >
                保存
              </button>
            </div>
          </motion.div>
        </>
      )}

      {showRemarkModal && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRemarkModal(false)}
            className="fixed inset-0 bg-black/40 z-[100]"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
            className="fixed top-1/2 left-1/2 w-[80%] bg-white rounded-[12px] z-[110] flex flex-col overflow-hidden"
          >
            <div className="p-5 pb-4">
              <div className="text-[17px] font-medium text-gray-900 mb-4">修改备注名</div>
              <input 
                type="text" 
                value={remarkInput}
                onChange={e => setRemarkInput(e.target.value)}
                placeholder="请输入备注名"
                className="w-full h-10 px-0 border-b border-[#07C160] text-[16px] focus:outline-none focus:border-[#07C160] transition-colors"
                autoFocus
              />
            </div>
            
            <div className="flex border-t border-gray-100">
              <button 
                onClick={() => setShowRemarkModal(false)}
                className="flex-1 py-3 text-[16px] font-medium text-gray-900 active:bg-gray-50 transition-colors border-r border-gray-100"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  if (onSetRemark) onSetRemark(remarkInput);
                  setShowRemarkModal(false);
                }}
                className="flex-1 py-3 text-[16px] font-medium text-[#576B95] active:bg-gray-50 transition-colors"
              >
                确定
              </button>
            </div>
          </motion.div>
        </>
      )}

      {showWallpaperModal && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowWallpaperModal(false)}
            className="fixed inset-0 bg-black/40 z-[100]"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
            className="fixed top-1/2 left-1/2 w-[84%] bg-white rounded-[20px] z-[110] flex flex-col p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <span className="text-[17px] font-medium text-gray-800">更换壁纸</span>
              <button onClick={() => setShowWallpaperModal(false)} className="text-gray-400 active:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="flex gap-4 mb-5">
              <button 
                onClick={() => setWallpaperType('url')}
                className={`flex-1 flex flex-col items-center justify-center py-5 rounded-[12px] border-2 transition-colors ${wallpaperType === 'url' ? 'border-[#07C160]' : 'border-gray-200'}`}
              >
                <Globe size={28} className={wallpaperType === 'url' ? 'text-[#07C160]' : 'text-gray-400'} strokeWidth={1.5} />
                <span className={`text-[14px] font-medium mt-2 leading-tight ${wallpaperType === 'url' ? 'text-[#07C160]' : 'text-gray-500'}`}>网络<br/>URL</span>
              </button>
              <button 
                onClick={() => setWallpaperType('local')}
                className={`flex-1 flex flex-col items-center justify-center py-5 rounded-[12px] border-2 transition-colors ${wallpaperType === 'local' ? 'border-[#07C160]' : 'border-gray-200'}`}
              >
                <Folder size={28} className={wallpaperType === 'local' ? 'text-[#07C160]' : 'text-gray-400'} strokeWidth={1.5} />
                <span className={`text-[14px] font-medium mt-2 leading-tight ${wallpaperType === 'local' ? 'text-[#07C160]' : 'text-gray-500'}`}>本地<br/>文件</span>
              </button>
            </div>

            <div className="min-h-[80px]">
              {wallpaperType === 'url' ? (
                <>
                  <input 
                    type="text" 
                    value={wallpaperUrl}
                    onChange={e => setWallpaperUrl(e.target.value)}
                    placeholder="输入图片URL地址"
                    className="w-full h-11 px-3 border border-gray-200 rounded-[8px] text-[15px] focus:outline-none focus:border-gray-400 transition-colors mb-2"
                  />
                  <div className="text-[12px] text-gray-400">支持 jpg, png, gif, webp 格式</div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center pt-2">
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef}
                    onChange={handleLocalFileChange}
                    className="hidden"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-[8px] text-[15px] font-medium active:bg-[#f2f2f2] transition-colors shadow-sm"
                  >
                    选择图片文件
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-6">
              <button 
                onClick={() => setShowWallpaperModal(false)}
                className="flex-1 py-3 bg-[#f2f2f2] text-gray-800 rounded-[8px] text-[15px] font-medium active:bg-[#e5e5e5] transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleApplyWallpaper}
                disabled={wallpaperType === 'local' || !wallpaperUrl.trim()}
                className={`flex-1 py-3 text-white rounded-[8px] text-[15px] font-medium transition-colors ${wallpaperType === 'local' || !wallpaperUrl.trim() ? 'bg-gray-300' : 'bg-[#333333] active:bg-black'}`}
              >
                应用壁纸
              </button>
            </div>

            <div className="mt-5 text-center">
              <button 
                onClick={() => {
                  if (onSetWallpaper) onSetWallpaper('');
                  setShowWallpaperModal(false);
                }}
                className="text-[13px] text-gray-500 active:text-gray-700"
              >
                恢复默认壁纸
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
};

// ─── Token 统计条 + 弹窗组件 ───────────────────────────────────────────────
const TokenBar = ({ friend, messages, consoleLogs = [], onClearLogs }: { friend: any; messages: any[]; consoleLogs?: string[]; onClearLogs?: () => void }) => {
  const [showModal, setShowModal] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleViewAll, setConsoleViewAll] = useState(false);
  const [tokenData, setTokenData] = useState<{
    aiPersona: number; userPersona: number; worldbook: number;
    history: number; memory: number; system: number; contextLimit: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const calcTokens = (text: string): number => {
    if (!text) return 0;
    const chinese = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
    const remaining = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, '');
    const engWords = (remaining.match(/[a-zA-Z]+/g) || []).length;
    const otherChars = remaining.replace(/[a-zA-Z\s]/g, '').length;
    return Math.ceil(chinese * 1.5) + Math.ceil(engWords * 0.3) + Math.ceil(otherChars * 0.3);
  };

  const calcAll = async () => {
    setLoading(true);
    try {
      const contactIdStr = String(friend.id);
      const settingsRec = await AppDB.appSettings.get(`chat_settings_${friend.id}`);
      const contextLimit: number = settingsRec?.value?.contextLimit ?? 50;
      const memoryInjectLimit: number = settingsRec?.value?.memoryInjectLimit ?? 30;

      // 1. AI 人设
      let aiPersonaText = '';
      if (friend.mode === 'detailed') {
        aiPersonaText = [
          friend.name, friend.gender, friend.age, friend.birthday,
          friend.identity, friend.personality, friend.appearance,
          friend.communication_style, friend.lifestyle, friend.background,
          friend.relationship, friend.nsfw_info, friend.wechatName, friend.wechatId, friend.signature
        ].filter(Boolean).join(' ');
      } else {
        aiPersonaText = [friend.name, friend.bio, friend.wechatName, friend.wechatId, friend.signature].filter(Boolean).join(' ');
      }
      const aiPersonaTokens = calcTokens(aiPersonaText) + 800;

      // 2. User 人设
      const myPersonaRec = await AppDB.appSettings.get('my_persona');
      const mp = myPersonaRec?.value || {};
      const userPersonaText = [
        mp.name, mp.real_name, mp.gender, mp.age, mp.birthday,
        mp.identity, mp.personality, mp.appearance,
        mp.communication_style, mp.lifestyle, mp.background, mp.nsfw, mp.wechat_id, mp.signature
      ].filter(Boolean).join(' ');
      const userPersonaTokens = calcTokens(userPersonaText);

      // 3. 世界书（基于当前 messages 做关键词匹配）
      let worldbookText = '';
      try {
        const savedBooks = localStorage.getItem('os_worldbooks');
        if (savedBooks) {
          let books = JSON.parse(savedBooks);
          const linkedIds = friend.linked_worldbooks || friend.linkedWorldbooks || null;
          if (Array.isArray(linkedIds) && linkedIds.length > 0) books = books.filter((wb: any) => linkedIds.includes(wb.id));
          else if (Array.isArray(linkedIds) && linkedIds.length === 0) books = [];
          const recentTexts = messages.filter(m => m.text).map(m => m.text.toLowerCase()).join(' ');
          books.forEach((wb: any) => {
            if (wb.editMode === 'simple') { if (wb.content) worldbookText += wb.content + ' '; }
            else if (wb.entries?.length > 0) {
              wb.entries.forEach((entry: any) => {
                const keys = entry.keys.split(/[,，]/).map((k: string) => k.trim().toLowerCase()).filter((k: string) => k);
                if (keys.length > 0 && keys.some((k: string) => recentTexts.includes(k))) worldbookText += entry.content + ' ';
              });
            }
          });
        }
      } catch (e) {}
      const worldbookTokens = calcTokens(worldbookText);

      // 4. 历史消息（按 contextLimit 截取）
      const allMsgs = await AppDB.messages.where('contactId').equals(contactIdStr).sortBy('fullTimestamp');
      const historySlice = allMsgs.slice(-contextLimit);
      const historyTokens = calcTokens(historySlice.map((m: any) => m.text || '').join(' '));

      // 5. 记忆摘要
      const memories = await AppDB.memories.where('contactId').equals(contactIdStr).toArray();
      const memSlice = memories.slice(-memoryInjectLimit);
      const memoryTokens = calcTokens(memSlice.map((m: any) => m.summary || '').join(' '));

      // 6. 系统指令固定开销
      const systemTokens = 600;

      setTokenData({ aiPersona: aiPersonaTokens, userPersona: userPersonaTokens, worldbook: worldbookTokens, history: historyTokens, memory: memoryTokens, system: systemTokens, contextLimit });
    } catch (e) { console.error('TokenBar calc error', e); }
    setLoading(false);
  };

  const handleOpen = () => { setShowModal(true); calcAll(); };

  const total = tokenData ? tokenData.aiPersona + tokenData.userPersona + tokenData.worldbook + tokenData.history + tokenData.memory + tokenData.system : 0;

  const PIE_COLORS = ['#8673f8', '#f87171', '#34d399', '#60a5fa', '#fbbf24', '#a78bfa'];
  const PIE_LABELS = ['AI人设', 'User人设', '世界书', '历史消息', '记忆摘要', '系统指令'];

  const buildPiePath = (values: number[], cx: number, cy: number, r: number) => {
    const sum = values.reduce((a, b) => a + b, 0);
    if (sum === 0) return [];
    let angle = -Math.PI / 2;
    return values.map((v, i) => {
      const slice = (v / sum) * 2 * Math.PI;
      const startAngle = angle;
      angle += slice;
      const x1 = cx + r * Math.cos(startAngle); const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(angle); const y2 = cy + r * Math.sin(angle);
      return { d: `M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${slice > Math.PI ? 1 : 0},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`, color: PIE_COLORS[i], label: PIE_LABELS[i], value: v, pct: sum > 0 ? ((v / sum) * 100).toFixed(1) : '0' };
    });
  };

  const PIE_VALUES = tokenData ? [tokenData.aiPersona, tokenData.userPersona, tokenData.worldbook, tokenData.history, tokenData.memory, tokenData.system] : [];

  const errorCount = consoleLogs.filter(l => l.includes('[ERROR]')).length;
  const displayedLogs = consoleViewAll
    ? consoleLogs
    : consoleLogs.filter(l => l.includes('[ERROR]') || l.includes('[WARN]'));

  const handleCopyLogs = () => {
    const text = consoleLogs.join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
  };

  return (
    <>
      {/* Console expand panel */}
      <AnimatePresence>
        {consoleOpen && (
          <motion.div
            key="console-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden shrink-0"
            style={{ background: '#1a2035', borderTop: '1px solid rgba(255,255,255,0.07)' }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
              <span className="text-[11px] text-white/50">
                {consoleViewAll ? '全部日志' : '仅显示 warn / error'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="px-2.5 py-0.5 rounded-md text-[11px] font-medium text-white/70 bg-white/10 active:bg-white/20 transition-colors"
                  onClick={() => setConsoleViewAll(v => !v)}
                >
                  {consoleViewAll ? '仅错误' : '查看全部'}
                </button>
                <button
                  className="px-2.5 py-0.5 rounded-md text-[11px] font-medium text-white/70 bg-white/10 active:bg-white/20 transition-colors"
                  onClick={() => { if (onClearLogs) onClearLogs(); }}
                >
                  清空
                </button>
                <button
                  className="px-2.5 py-0.5 rounded-md text-[11px] font-medium text-white/70 bg-white/10 active:bg-white/20 transition-colors"
                  onClick={handleCopyLogs}
                >
                  复制
                </button>
              </div>
            </div>
            {/* Log body */}
            <div className="px-4 py-2 max-h-[30vh] overflow-y-auto no-scrollbar">
              {displayedLogs.length === 0 ? (
                <p className="text-[11px] text-white/30 py-1">
                  {consoleViewAll ? '暂无日志。' : '目前没有警告或错误资料。'}
                </p>
              ) : (
                displayedLogs.map((log, i) => (
                  <div
                    key={i}
                    className={`text-[10px] font-mono py-0.5 break-all leading-relaxed ${
                      log.includes('[ERROR]') ? 'text-red-400' : log.includes('[WARN]') ? 'text-yellow-400' : 'text-white/60'
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Console toggle bar */}
      <div
        className="bg-white border-t border-gray-200 px-4 py-2 shrink-0 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors select-none"
        onClick={() => setConsoleOpen(v => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-gray-700">查看控制台 (Log/警告/错误)</span>
          {errorCount > 0 && (
            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
              {errorCount} 错误
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleOpen(); }}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#8673f8] text-white rounded-full text-[12px] font-medium active:bg-[#7360e0] transition-colors"
          >
            <span className="text-[10px]">◐</span>
            <span>{total > 0 ? total.toLocaleString() : '···'}</span>
          </button>
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            className={`text-gray-400 transition-transform duration-200 ${consoleOpen ? 'rotate-180' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/50 z-[150]" />
            <motion.div
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[160] bg-white rounded-t-[20px] shadow-[0_-4px_24px_rgba(0,0,0,0.15)] flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[17px] font-medium text-gray-800">Token 预估</span>
                  <span className="text-[12px] text-[#8673f8] bg-[#f0edff] px-2 py-0.5 rounded-full font-medium">下一轮 AI 输入</span>
                </div>
                <button onClick={() => setShowModal(false)} className="text-gray-400 active:text-gray-600 p-1 -mr-1"><X size={18} strokeWidth={2} /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 no-scrollbar">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-2 border-[#8673f8] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : tokenData ? (
                  <>
                    <div className="text-center mb-6">
                      <span className="text-[36px] font-bold text-[#8673f8] tracking-tight">{total.toLocaleString()}</span>
                      <span className="text-[14px] text-gray-400 ml-1">tokens</span>
                    </div>

                    {total > 0 && (() => {
                      const slices = buildPiePath(PIE_VALUES, 90, 90, 80);
                      return (
                        <div className="flex items-center gap-4 mb-6">
                          <svg width="180" height="180" className="shrink-0">
                            {slices.map((s, i) => <path key={i} d={s.d} fill={s.color} stroke="white" strokeWidth="1.5" />)}
                            <circle cx="90" cy="90" r="40" fill="white" />
                            <text x="90" y="86" textAnchor="middle" fontSize="11" fill="#888" fontWeight="500">总计</text>
                            <text x="90" y="100" textAnchor="middle" fontSize="13" fill="#333" fontWeight="700">{total > 9999 ? (total / 1000).toFixed(1) + 'k' : total}</text>
                          </svg>
                          <div className="flex flex-col gap-2 flex-1">
                            {slices.map((s, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                                <span className="text-[12px] text-gray-600 flex-1">{s.label}</span>
                                <span className="text-[11px] text-gray-400 font-mono">{s.pct}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex flex-col gap-2">
                      {[
                        { label: 'AI 人设', value: tokenData.aiPersona, color: PIE_COLORS[0], desc: '角色设定 + prompt 框架' },
                        { label: 'User 人设', value: tokenData.userPersona, color: PIE_COLORS[1], desc: '用户档案信息' },
                        { label: '世界书', value: tokenData.worldbook, color: PIE_COLORS[2], desc: '关联世界书内容' },
                        { label: '历史消息', value: tokenData.history, color: PIE_COLORS[3], desc: `上下文 ${tokenData.contextLimit} 条` },
                        { label: '记忆摘要', value: tokenData.memory, color: PIE_COLORS[4], desc: '注入的记忆片段' },
                        { label: '系统指令', value: tokenData.system, color: PIE_COLORS[5], desc: '格式 / 模式指令' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-[10px] px-3 py-2.5">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: item.color }} />
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-[14px] font-medium text-gray-800">{item.label}</span>
                            <span className="text-[11px] text-gray-400">{item.desc}</span>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <span className="text-[15px] font-bold text-gray-800">{item.value.toLocaleString()}</span>
                            <span className="text-[10px] text-gray-400">{total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] text-gray-400 text-center mt-4 leading-relaxed">
                      估算规则：中文字 ×1.5 / 英文单词 ×0.3 / 其他字符 ×0.3<br/>实际消耗以模型 API 返回为准
                    </p>
                  </>
                ) : (
                  <div className="text-center py-10 text-gray-400 text-[14px]">计算失败，请重试</div>
                )}
              </div>

              <div className="px-5 pb-8 pt-2 shrink-0">
                <button onClick={() => { setTokenData(null); calcAll(); }} className="w-full py-3 bg-[#8673f8] text-white rounded-[12px] text-[15px] font-medium active:bg-[#7360e0] transition-colors">
                  重新计算
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

const ChatScreen = ({ friend, myAvatar, messages, onSendMessage, onBack, onSetRemark, onDeleteMessages, onEditMessage, walletBalance, setWalletBalance, bankCards, setBankCards, onClearChat, onTriggerAI, isTyping, onUpdateFriend, consoleLogs, onClearConsoleLogs }: { friend: any, myAvatar?: string, messages: any[], onSendMessage: (msg: string, msgType?: string, recalledContent?: string) => void, onBack: () => void, onSetRemark?: (remark: string) => void, onDeleteMessages?: (messageIds: number[]) => void, onEditMessage?: (msgId: number, text: string) => void, walletBalance: number, setWalletBalance: (v: number) => void, bankCards: any[], setBankCards: (cards: any[]) => void, onClearChat?: () => void, onTriggerAI?: () => void, isTyping?: boolean, onUpdateFriend?: (data: any) => void, consoleLogs?: string[], onClearConsoleLogs?: () => void }) => {
  const [inputText, setInputText] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [actionMenuMsg, setActionMenuMsg] = useState<any | null>(null);
  const [editingMsg, setEditingMsg] = useState<any | null>(null);
  const [editingText, setEditingText] = useState('');
  const [recalledContentToShow, setRecalledContentToShow] = useState<string | null>(null);
  const [isMultiSelecting, setIsMultiSelecting] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<number[]>([]);
  const [showPluginPanel, setShowPluginPanel] = useState(false);
  // 我谕道具系统
  const [showWoYuModal, setShowWoYuModal] = useState(false);
  const [woYuActiveRecord, setWoYuActiveRecord] = useState<WoKongActiveRecord | null>(() =>
    friend?.id ? getActiveRecord(String(friend.id)) : null
  );
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRedPacketModal, setShowRedPacketModal] = useState(false);
  const [showImageDescModal, setShowImageDescModal] = useState(false);
  const [imageDesc, setImageDesc] = useState('');
  const [viewingImageDesc, setViewingImageDesc] = useState<string | null>(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceInput, setVoiceInput] = useState('');
  const [expandedVoiceMsgIds, setExpandedVoiceMsgIds] = useState<Set<number>>(new Set());
  const [moneyAmount, setMoneyAmount] = useState('');
  const [moneyTitle, setMoneyTitle] = useState('');
  const [quotedMessage, setQuotedMessage] = useState<any | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showMindCardSetting, setShowMindCardSetting] = useState(false);
  const [viewingMindCard, setViewingMindCard] = useState<any | null>(null);
  const [showConsoleAndTokenSetting, setShowConsoleAndTokenSetting] = useState(false);
  const [useCoTSetting, setUseCoTSetting] = useState(false);
  const [showCotDisplaySetting, setShowCotDisplaySetting] = useState(false);
  const [viewingCotContent, setViewingCotContent] = useState<string | null>(null);
  const [transferActionMsg, setTransferActionMsg] = useState<any | null>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const visionFileInputRef = useRef<HTMLInputElement>(null);

  const [bubbleFontSize, setBubbleFontSize] = useState(15);
  const [bubbleColor, setBubbleColor] = useState('');
  const [aiNarratorFontSize, setAiNarratorFontSize] = useState(14);
  const [aiNarratorColor, setAiNarratorColor] = useState('');
  const [userNarratorFontSize, setUserNarratorFontSize] = useState(14);
  const [userNarratorColor, setUserNarratorColor] = useState('');
  const [systemMsgFontSize, setSystemMsgFontSize] = useState(12);
  const [systemMsgColor, setSystemMsgColor] = useState('');

  const [showWorldbookSelect, setShowWorldbookSelect] = useState(false);
  const [showPhoneCall, setShowPhoneCall] = useState(false);
  const [callStatus, setCallStatus] = useState<'calling' | 'connected' | 'rejected'>('calling');
  // 通话回顾：存储被点击的 PHONE_CALL_END 消息的 idx（在 messages 数组中的位置）
  const [callReviewEndIdx, setCallReviewEndIdx] = useState<number | null>(null);
  // 通话气泡长按删除菜单
  const [callBubbleLongPressMsg, setCallBubbleLongPressMsg] = useState<{ msg: any; endIdx: number } | null>(null);
  const callBubbleLongPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const callRejectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [callInputText, setCallInputText] = useState('');
  const callInputRef = useRef<HTMLInputElement>(null);
  const [callMsgActionMenu, setCallMsgActionMenu] = useState<{ msg: any } | null>(null);
  const [callEditingMsg, setCallEditingMsg] = useState<any | null>(null);
  const [callEditingText, setCallEditingText] = useState('');
  const callMsgLongPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [linkedWorldbooks, setLinkedWorldbooks] = useState<string[]>(friend?.linkedWorldbooks || friend?.linked_worldbooks || []);
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

  const [showTimestampMenu, setShowTimestampMenu] = useState(false);
  const [timestampLongPressMsg, setTimestampLongPressMsg] = useState<any>(null);
  const timestampLongPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [hiddenTimestamps, setHiddenTimestamps] = useState<Set<number>>(new Set());

  const startTimestampLongPress = (msg?: any) => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    timestampLongPressTimerRef.current = setTimeout(() => {
      setTimestampLongPressMsg(msg ?? null);
      setShowTimestampMenu(true);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  const cancelTimestampLongPress = () => {
    if (timestampLongPressTimerRef.current) {
      clearTimeout(timestampLongPressTimerRef.current);
      timestampLongPressTimerRef.current = null;
    }
  };

  const [offlineStartTime, setOfflineStartTime] = useState<number | null>(() => {
    const saved = localStorage.getItem(`wechat_offline_${friend.id}`);
    return saved ? parseInt(saved) : null;
  });
  const [offlineDuration, setOfflineDuration] = useState<number>(0);
  const [isOfflineExpanded, setIsOfflineExpanded] = useState(false);
  const [isNarratorMode, setIsNarratorMode] = useState(false);
  const [showStickerPanel, setShowStickerPanel] = useState(false);

  let currentOfflineLocation = friend.region ? `${friend.region} -> 附近` : '未知 -> 附近';
  for (let i = messages.length - 1; i >= 0; i--) {
    const txt = messages[i]?.text;
    if (txt) {
      const match = txt.match(/\[LOCATION:(.*?)\]/);
      if (match) {
        currentOfflineLocation = match[1];
        break;
      }
    }
  }

  useEffect(() => {
    if (friend?.id) {
       AppDB.appSettings.get(`chat_settings_${friend.id}`).then(record => {
         if (record && record.value) {
           if (record.value.showConsoleAndToken !== undefined) setShowConsoleAndTokenSetting(record.value.showConsoleAndToken);
           if (record.value.showMindCard !== undefined) setShowMindCardSetting(record.value.showMindCard);
           if (record.value.useCoT !== undefined) setUseCoTSetting(record.value.useCoT);
           if (record.value.showCotDisplay !== undefined) setShowCotDisplaySetting(record.value.showCotDisplay);
           if (record.value.bubbleFontSize !== undefined) setBubbleFontSize(record.value.bubbleFontSize);
           if (record.value.bubbleColor !== undefined) setBubbleColor(record.value.bubbleColor);
           if (record.value.aiNarratorFontSize !== undefined) setAiNarratorFontSize(record.value.aiNarratorFontSize);
           if (record.value.aiNarratorColor !== undefined) setAiNarratorColor(record.value.aiNarratorColor);
           if (record.value.userNarratorFontSize !== undefined) setUserNarratorFontSize(record.value.userNarratorFontSize);
           if (record.value.userNarratorColor !== undefined) setUserNarratorColor(record.value.userNarratorColor);
           if (record.value.systemMsgFontSize !== undefined) setSystemMsgFontSize(record.value.systemMsgFontSize);
           if (record.value.systemMsgColor !== undefined) setSystemMsgColor(record.value.systemMsgColor);
         }
       });
    }
  }, [friend?.id, showSettings]); // Re-fetch if settings modal closes

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (offlineStartTime) {
      setOfflineDuration(Date.now() - offlineStartTime);
      interval = setInterval(() => {
        setOfflineDuration(Date.now() - offlineStartTime);
      }, 60000); // update every minute
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [offlineStartTime]);

  const formatDuration = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    return `${minutes}分钟`;
  };

  const startLongPress = (msg: any) => {
    longPressTimerRef.current = setTimeout(() => {
      setActionMenuMsg(msg);
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const [chatWallpaper, setChatWallpaper] = useState<string | null>(() => {
    return localStorage.getItem(`wechat_wallpaper_${friend.id}`);
  });

  const handleSetWallpaper = (wp: string) => {
    setChatWallpaper(wp);
    if (wp) {
      localStorage.setItem(`wechat_wallpaper_${friend.id}`, wp);
    } else {
      localStorage.removeItem(`wechat_wallpaper_${friend.id}`);
    }
  };

  const displayFriendName = friend.wechat_remark || friend.name;

  // 自动滚动到底部
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <>
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 bg-[#ededed] z-[80] flex flex-col pt-4"
      style={chatWallpaper ? { backgroundImage: `url(${chatWallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-[#ededed]">
        {isMultiSelecting ? (
          <button onClick={() => {
            setIsMultiSelecting(false);
            setSelectedMsgIds([]);
          }} className="p-2 -ml-2 text-[16px] font-medium text-gray-800 active:bg-gray-200 rounded-[8px] transition-colors z-10">
            取消
          </button>
        ) : (
          <button onClick={onBack} className="p-2 -ml-2 text-gray-800 active:bg-gray-200 rounded-full transition-colors z-10">
            <ChevronLeft size={24} strokeWidth={2} />
          </button>
        )}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span className="text-[17px] font-medium text-gray-800">
            {isMultiSelecting ? '选择消息' : displayFriendName}
          </span>
          {!isMultiSelecting && isTyping && (
            <span className="text-[10px] text-gray-500 font-normal">对方正在输入...</span>
          )}
        </div>
        {isMultiSelecting ? (
          <div className="w-[40px]"></div>
        ) : (
          <button onClick={() => setShowSettings(true)} className="p-2 -mr-2 text-gray-800 active:bg-gray-200 rounded-full transition-colors z-10">
            <MoreHorizontal size={24} strokeWidth={2} />
          </button>
        )}
      </div>

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
              className="absolute top-2 left-1/2 -translate-x-1/2 w-[92%] bg-white/95 backdrop-blur-md rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-gray-100 p-5 flex flex-col items-center gap-1 cursor-pointer"
              onClick={() => setIsOfflineExpanded(false)}
            >
              <div className="flex justify-between items-center w-full px-2 mt-1">
                  <div className="flex flex-col items-center">
                     <div className="w-[52px] h-[52px] bg-gray-200 rounded-[14px] flex items-center justify-center overflow-hidden shrink-0">
                         {friend.avatar ? <img src={friend.avatar} alt="avatar" className="w-full h-full object-cover" /> : <User size={24} className="text-gray-400" />}
                     </div>
                     <span className="text-[13px] text-gray-700 mt-2 font-medium">{displayFriendName}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 flex-1 justify-center px-4 -mt-6">
                     <div className="h-[2px] flex-1 bg-gray-200 border-t-[2.5px] border-dashed border-gray-300 bg-clip-text"></div>
                     <span className="text-[12px] bg-[#f5f5f5] text-gray-600 px-3 py-[3px] rounded-full font-medium shadow-sm border border-gray-100">见面中</span>
                     <div className="h-[2px] flex-1 bg-gray-200 border-t-[2.5px] border-dashed border-gray-300 bg-clip-text"></div>
                  </div>

                  <div className="flex flex-col items-center">
                     <div className="w-[52px] h-[52px] bg-gray-200 rounded-[14px] flex items-center justify-center overflow-hidden shrink-0">
                         {myAvatar ? <img src={myAvatar} alt="my avatar" className="w-full h-full object-cover" /> : <User size={24} className="text-gray-400" />}
                     </div>
                     <span className="text-[13px] text-gray-700 mt-2 font-medium">我</span>
                  </div>
              </div>

              <div className="mt-4 flex items-center gap-1.5 text-[15px] font-medium text-gray-900 tracking-wide">
                 <MapPin size={16} className="text-red-500 fill-red-100" strokeWidth={2.5}/>
                 <span>{currentOfflineLocation}</span>
              </div>

              <div className="mt-[2px] flex items-center gap-1.5 text-[14px] text-gray-400 mb-2">
                  <span>⏱️</span>
                  <span>已见面 {formatDuration(offlineDuration)}</span>
              </div>

              <button 
                 onClick={(e) => {
                     e.stopPropagation();
                     setOfflineStartTime(null);
                     localStorage.removeItem(`wechat_offline_${friend.id}`);
                     onSendMessage('「你们结束了线下见面」', 'narrator');
                 }}
                 className="mt-3 w-full bg-[#f2f2f2] text-gray-700 py-3 rounded-[12px] text-[16px] font-medium active:bg-gray-200 transition-colors"
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
              className="w-full bg-[#f8f8f8] flex items-center justify-center cursor-pointer overflow-hidden border-b border-gray-200"
              onClick={() => setIsOfflineExpanded(true)}
            >
                <div className="py-[10px] flex items-center gap-1.5 text-[13px] text-[#555] font-medium tracking-wide">
                   <MapPin size={15} className="text-[#e25d5d] fill-[#ffe5e5]" strokeWidth={2}/>
                   <span>{currentOfflineLocation}</span>
                </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      )}

      {/* 我谕常驻 chip */}
      {woYuActiveRecord && (
        <div
          className={`wuyu-active-bar ${woYuActiveRecord.state === 'pending' ? 'is-pending' : 'is-active'}`}
          onClick={() => setShowWoYuModal(true)}
        >
          <span className="wuyu-bar-emoji">
            {woYuActiveRecord.state === 'pending' ? '⏳' : '✦'}
          </span>
          <span className="wuyu-bar-text">
            {(() => {
              const item = woYuActiveRecord.itemSnapshot as any;
              const n = item?.name || '道具';
              const e = item?.emoji ? item.emoji + ' ' : '';
              if (woYuActiveRecord.state === 'pending') {
                const need = item?.trigger?.hitCount ?? 1;
                const got = (woYuActiveRecord as any).triggerHitCounter ?? 0;
                return `${e}${n} · 待触发 ${got}/${need}`;
              }
              const end = item?.end || {};
              if (end.mode === 'msgCount') {
                const left = Math.max(0, (woYuActiveRecord as any).msgCounterRemaining ?? 0);
                return `${e}${n} · 还剩 ${left} 条`;
              }
              if (end.mode === 'duration') {
                const ref = (woYuActiveRecord as any).activatedAt ?? (woYuActiveRecord as any).deliveredAt;
                const left = Math.max(0, (end.durationMin ?? 0) - Math.floor((Date.now() - ref) / 60000));
                return `${e}${n} · 还剩 ${left} 分钟`;
              }
              if (end.mode === 'keyword') {
                const need = end.hitCount ?? 1;
                const got = (woYuActiveRecord as any).endHitCounter ?? 0;
                return `${e}${n} · 命中 ${got}/${need}`;
              }
              return `${e}${n} · 生效中`;
            })()}
          </span>
          <button
            className="wuyu-bar-close"
            onClick={(e) => {
              e.stopPropagation();
              if (!confirm('确定撤回当前生效的道具？')) return;
              const narration = revokeActiveProp(String(friend.id));
              setWoYuActiveRecord(null);
              if (narration) onSendMessage(narration, 'system');
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Chat Area */}
      <div ref={chatAreaRef} className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-4 no-scrollbar">
        {messages.length === 0 && (
          <div className="text-center mt-2">
             <span className="text-[12px] text-gray-400"><CurrentTime /></span>
          </div>
        )}
        {(() => {
          // 寻找最后一条AI消息（含有心声卡片的优先，否则取最后一条非narrator的AI消息）
          // 解析 AI 回复中的 <thinking>...</thinking>（支持多种格式）
          const extractCotContent = (text: string): string | null => {
            if (!text) return null;
            // 标准 <thinking>...</thinking>
            const m1 = text.match(/<thinking>([\s\S]*?)<\/thinking>/i);
            if (m1) return m1[1].trim();
            // [THINK]...[/THINK]
            const m2 = text.match(/\[THINK\]([\s\S]*?)\[\/THINK\]/i);
            if (m2) return m2[1].trim();
            return null;
          };

          // 找最后一条 AI 消息：优先含 <thinking> 的，否则取最后一条非 narrator/system 的 AI 消息
          let lastAiCotMsgIdx = -1;
          let lastAiCotContent: string | null = null;
          for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            if (!m.isMe && m.msgType !== 'system') {
              const cot = extractCotContent(m.text || '');
              if (cot) {
                lastAiCotMsgIdx = i;
                lastAiCotContent = cot;
                break;
              }
              // 没有 <thinking> 内容，但仍标记为候选（仅当没找到更好的时）
              if (lastAiCotMsgIdx === -1) {
                lastAiCotMsgIdx = i;
                lastAiCotContent = m.text || '';
              }
            }
          }

          let lastAiMsgIdx = -1;
          // 先尝试找最后一条有mindCard数据或含有[MIND_CARD]标记的AI消息
          for (let i = messages.length - 1; i >= 0; i--) {
            if (!messages[i].isMe) {
              const text = messages[i].text || '';
              if (messages[i].mindCard || /\[MIND_CARD\]/.test(text)) {
                lastAiMsgIdx = i;
                break;
              }
            }
          }
          // 如果没找到含心声的，再找最后一条非narrator的AI消息
          if (lastAiMsgIdx === -1) {
            for (let i = messages.length - 1; i >= 0; i--) {
              if (!messages[i].isMe && messages[i].msgType !== 'narrator') {
                lastAiMsgIdx = i;
                break;
              }
            }
          }
          // 如果仍然没找到（纯线下模式全是narrator），找最后一条AI消息
          if (lastAiMsgIdx === -1) {
            for (let i = messages.length - 1; i >= 0; i--) {
              if (!messages[i].isMe && messages[i].msgType !== 'system') {
                lastAiMsgIdx = i;
                break;
              }
            }
          }
          // 预计算通话区间：PHONE_CALL_START 到 PHONE_CALL_END 之间的消息索引（含 START，不含 END）
          const callRangeHiddenIdxSet = new Set<number>();
          {
            let inCall = false;
            for (let i = 0; i < messages.length; i++) {
              const t = messages[i].text || '';
              if (t === '[PHONE_CALL_START]') { inCall = true; callRangeHiddenIdxSet.add(i); continue; }
              if (inCall && messages[i].msgType === 'system' && t.startsWith('[PHONE_CALL_END:')) { inCall = false; continue; }
              if (inCall) callRangeHiddenIdxSet.add(i);
            }
          }
          return messages.map((msg, idx) => {
            // 通话区间内的消息（包含 PHONE_CALL_START 和通话期间的普通消息）不在主界面显示
            if (callRangeHiddenIdxSet.has(idx)) return null;
            // 通话结束记录：渲染为绿色气泡
            if (msg.msgType === 'system' && msg.text && msg.text.startsWith('[PHONE_CALL_END:')) {
              const mmss = msg.text.match(/^\[PHONE_CALL_END:([\d:]+)\]$/)?.[1] || '';
              const prevVisibleMsgForCall = (() => {
                for (let i = idx - 1; i >= 0; i--) {
                  if (messages[i].msgType !== 'system') return messages[i];
                }
                return null;
              })();
              const showTimeForCall = shouldShowTimestamp(
                msg.fullTimestamp ?? msg.timestamp ?? 0,
                prevVisibleMsgForCall ? (prevVisibleMsgForCall.fullTimestamp ?? prevVisibleMsgForCall.timestamp ?? null) : null
              );
              const callTimestampValue = msg.fullTimestamp ?? msg.timestamp ?? 0;
              const isCallTimestampHidden = hiddenTimestamps.has(callTimestampValue);
              return (
                <React.Fragment key={idx}>
                  {showTimeForCall && !isCallTimestampHidden && (
                    <div
                      className="chat-timestamp"
                      onPointerDown={() => startTimestampLongPress(msg)}
                      onPointerUp={cancelTimestampLongPress}
                      onPointerLeave={cancelTimestampLongPress}
                      onPointerCancel={cancelTimestampLongPress}
                      onContextMenu={(e) => { e.preventDefault(); cancelTimestampLongPress(); }}
                    >
                      {formatChatTimestamp(msg.fullTimestamp ?? msg.timestamp ?? 0)}
                    </div>
                  )}
                  <div className="flex items-start gap-3 w-full my-1 flex-row-reverse">
                    <div className="w-10 h-10 bg-gray-200 rounded-[6px] flex items-center justify-center overflow-hidden shrink-0 mt-0.5">
                      {(friend.my_bound_avatar || myAvatar)
                        ? <img src={(friend.my_bound_avatar || myAvatar) as string} alt="" className="w-full h-full object-cover" />
                        : <User size={20} className="text-gray-400" />
                      }
                    </div>
                    <div
                      className="flex items-center gap-2 bg-[#95EC69] rounded-[10px] px-4 py-2.5 max-w-[70%] cursor-pointer active:brightness-95 select-none"
                      onClick={() => setCallReviewEndIdx(idx)}
                      onPointerDown={() => {
                        callBubbleLongPressTimer.current = setTimeout(() => {
                          if (navigator.vibrate) navigator.vibrate(50);
                          setCallBubbleLongPressMsg({ msg, endIdx: idx });
                        }, 500);
                      }}
                      onPointerUp={() => { if (callBubbleLongPressTimer.current) { clearTimeout(callBubbleLongPressTimer.current); callBubbleLongPressTimer.current = null; } }}
                      onPointerLeave={() => { if (callBubbleLongPressTimer.current) { clearTimeout(callBubbleLongPressTimer.current); callBubbleLongPressTimer.current = null; } }}
                      onPointerCancel={() => { if (callBubbleLongPressTimer.current) { clearTimeout(callBubbleLongPressTimer.current); callBubbleLongPressTimer.current = null; } }}
                      onContextMenu={(e) => { e.preventDefault(); if (callBubbleLongPressTimer.current) { clearTimeout(callBubbleLongPressTimer.current); callBubbleLongPressTimer.current = null; } }}
                    >
                      <Phone size={15} className="text-black/70 shrink-0" strokeWidth={2} />
                      <span className="text-[15px] text-black">[语音通话] 通话时长 {mmss}</span>
                    </div>
                  </div>
                </React.Fragment>
              );
            }
            if (msg.msgType === 'system') return null;

            let extractedMindCard = msg.mindCard || null;
            let cleanText = msg.text || '';
            let quoteInfo = null;

            const quoteMatch = cleanText.match(/^「(.*?)」\n- - - - - - - - - - - - - - -\n([\s\S]*)$/);
            const aiQuoteMatch = cleanText.match(/^\[引用:(.*?)\]\n([\s\S]*)$/);
            if (quoteMatch) {
              quoteInfo = quoteMatch[1];
              cleanText = quoteMatch[2];
            } else if (aiQuoteMatch) {
              quoteInfo = aiQuoteMatch[1];
              cleanText = aiQuoteMatch[2];
            }

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

            const locMatch = cleanText.match(/\[LOCATION:(.*?)\]/);
            if (locMatch) {
                cleanText = cleanText.replace(/\[LOCATION:.*?\]/g, '').trim();
                // 如果去掉 LOCATION 标记后内容为空，且没有 mindCard，则不渲染这条消息
                if (!cleanText && !extractedMindCard) return null;
            }

            let parts: any[] = [];
            if (msg.msgType === 'narrator') {
                // 按自然段拆分，每段独立渲染，确保每段可单独长按操作
                const narratorParas = cleanText.split(/\n+/).map((p: string) => p.trim()).filter((p: string) => p.length > 0);
                if (narratorParas.length > 0) {
                    parts = narratorParas.map((p: string) => ({ type: 'narrator', text: p }));
                } else {
                    parts = [{ type: 'narrator', text: cleanText }];
                }
            } else if (cleanText.startsWith('[红包]') || cleanText.startsWith('[TRANSFER:') || cleanText.match(/^\[image:.*\]$/) || cleanText.match(/^\[voice:.*\]$/)) {
                parts = [{ type: 'special', text: cleanText }];
            } else {
                const hasDialogue = cleanText.includes('「') && cleanText.includes('」');
                if (hasDialogue) {
                    let currentIdx = 0;
                    while (currentIdx < cleanText.length) {
                        const startQuote = cleanText.indexOf('「', currentIdx);
                        if (startQuote === -1) {
                            const text = cleanText.substring(currentIdx).trim();
                            if (text) parts.push({ type: 'narrator', text });
                            break;
                        }
                        if (startQuote > currentIdx) {
                            const text = cleanText.substring(currentIdx, startQuote).trim();
                            if (text) parts.push({ type: 'narrator', text });
                        }
                        const endQuote = cleanText.indexOf('」', startQuote + 1);
                        if (endQuote === -1) {
                            const text = cleanText.substring(startQuote).trim();
                            if (text) parts.push({ type: 'narrator', text });
                            break;
                        } else {
                            const text = cleanText.substring(startQuote + 1, endQuote).trim();
                            if (text) parts.push({ type: 'dialogue', text });
                            currentIdx = endQuote + 1;
                        }
                    }
                } else {
                    if (cleanText) parts.push({ type: 'dialogue', text: cleanText });
                }
            }

            const groups: any[] = [];
            let currentGroup: any = null;
            parts.forEach(p => {
                if (p.type === 'narrator' || p.type === 'special') {
                    groups.push({ type: p.type, parts: [p] });
                    currentGroup = null;
                } else {
                    if (!currentGroup || currentGroup.type !== 'dialogue') {
                        currentGroup = { type: 'dialogue', parts: [p] };
                        groups.push(currentGroup);
                    } else {
                        currentGroup.parts.push(p);
                    }
                }
            });

            // 判断此条消息是否是含 <thinking> 的最后一条 AI 消息
            const isCotMsg = useCoTSetting && !msg.isMe && idx === lastAiCotMsgIdx && lastAiCotContent;

            // 智能时间戳：跳过 system 消息后找上一条有效消息的时间戳
            const prevVisibleMsg = (() => {
              for (let i = idx - 1; i >= 0; i--) {
                if (messages[i].msgType !== 'system') return messages[i];
              }
              return null;
            })();
            const showTime = shouldShowTimestamp(
              msg.fullTimestamp ?? msg.timestamp ?? 0,
              prevVisibleMsg ? (prevVisibleMsg.fullTimestamp ?? prevVisibleMsg.timestamp ?? null) : null
            );
            const timestampValue = msg.fullTimestamp ?? msg.timestamp ?? 0;
            const isTimestampHidden = hiddenTimestamps.has(timestampValue);

            return (
              <React.Fragment key={idx}>
              {showTime && !isTimestampHidden && (
                <div
                  className="chat-timestamp"
                  onPointerDown={() => startTimestampLongPress(msg)}
                  onPointerUp={cancelTimestampLongPress}
                  onPointerLeave={cancelTimestampLongPress}
                  onPointerCancel={cancelTimestampLongPress}
                  onContextMenu={(e) => { e.preventDefault(); cancelTimestampLongPress(); }}
                >
                  {formatChatTimestamp(msg.fullTimestamp ?? msg.timestamp ?? 0)}
                </div>
              )}
              <div
                 className="flex flex-col w-full relative mb-1"
                 onClick={() => {
                   if (isMultiSelecting) {
                     if (selectedMsgIds.includes(msg.id)) {
                       setSelectedMsgIds(selectedMsgIds.filter((id: number) => id !== msg.id));
                     } else {
                       setSelectedMsgIds([...selectedMsgIds, msg.id]);
                     }
                   }
                 }}
              >
                {isMultiSelecting && (
                   <div className="absolute left-1 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center p-2">
                     <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedMsgIds.includes(msg.id) ? 'bg-[#07C160] border-[#07C160]' : 'border-gray-300 bg-transparent'}`}>
                       {selectedMsgIds.includes(msg.id) && <Check size={14} className="text-white" strokeWidth={3} />}
                     </div>
                   </div>
                )}

                {groups.map((group, gIdx) => {
                     const isLastGroup = gIdx === groups.length - 1;
                     if (group.type === 'narrator') {
                         const pIdx = 0;
                        const showDot = showMindCardSetting && !msg.isMe && extractedMindCard;
                        const narratorText = group.parts[0].text as string;
                        const isWuYuCard = /^\[.*(出现了|被收回了|的效果消退了)/.test(narratorText);
                        if (isWuYuCard) {
                          return (
                            <div
                              key={gIdx}
                              className={`chat-message narrator-message wuyu-card-narrator w-full flex justify-center my-4 select-none ${isMultiSelecting ? 'pl-10' : ''}`}
                              onPointerDown={() => { if (!isMultiSelecting) startLongPress(msg); }}
                              onPointerUp={() => { if (!isMultiSelecting) cancelLongPress(); }}
                              onPointerLeave={() => { if (!isMultiSelecting) cancelLongPress(); }}
                              onPointerCancel={() => { if (!isMultiSelecting) cancelLongPress(); }}
                              onContextMenu={(e: any) => { e.preventDefault(); if (!isMultiSelecting) cancelLongPress(); }}
                            >
                              <span className="narrator-content">{narratorText.replace(/^\[|\]$/g, '')}</span>
                            </div>
                          );
                        }
                        return (
                            <div 
                              key={gIdx} 
                              className={`w-full flex my-4 select-none px-4 ${isMultiSelecting ? 'pl-10' : ''}`}
                            >
                              <span 
                                className="relative text-[14px] text-gray-500/90 italic leading-relaxed break-words w-full text-center cursor-pointer"
                                style={{
                                   fontSize: msg.isMe ? (userNarratorFontSize ? `${userNarratorFontSize}px` : undefined) : (aiNarratorFontSize ? `${aiNarratorFontSize}px` : undefined),
                                   color: msg.isMe ? (userNarratorColor || undefined) : (aiNarratorColor || undefined)
                                }}
                               onClick={() => {
                                 if (!isMultiSelecting && msg.recalledContent) {
                                    setRecalledContentToShow(msg.recalledContent.replace(/\[SECONDS:\d+\]$/, ''));
                                 } else if (!isMultiSelecting && !msg.isMe && showMindCardSetting && extractedMindCard) {
                                    setViewingMindCard(extractedMindCard);
                                 }
                               }}
                               onPointerDown={() => { if (!isMultiSelecting) startLongPress(msg); }}
                               onPointerUp={() => { if (!isMultiSelecting) cancelLongPress(); }}
                               onPointerLeave={() => { if (!isMultiSelecting) cancelLongPress(); }}
                               onPointerCancel={() => { if (!isMultiSelecting) cancelLongPress(); }}
                               onContextMenu={(e: any) => { e.preventDefault(); if (!isMultiSelecting) cancelLongPress(); }}
                             >
                               {showDot && (
                                  <div className="absolute top-1 -right-2 w-2.5 h-2.5 bg-pink-400 rounded-full shadow-[0_0_0_1.5px_transparent] z-10" />
                               )}
                               <span className="whitespace-pre-wrap">{narratorText}</span>
                             </span>
                           </div>
                        );
                    } else if (group.type === 'special') {
                        const text = group.parts[0].text;
                        const isRedPacket = text.startsWith('[红包] ');
                        const isTransfer = text.startsWith('[TRANSFER:');
                        const isImage = text.match(/^\[image:(.*)\]$/);
                        const isVoice = text.match(/^\[voice:([\s\S]*)\]$/);

                        let content = null;
                        if (isVoice) {
                          const voiceText = isVoice[1];
                          const isExpanded = expandedVoiceMsgIds.has(msg.id);
                          // 估算时长：每字约0.3秒，最少1秒
                          const duration = Math.max(1, Math.round(voiceText.length * 0.3));
                          content = (
                            <div
                              className={`select-none rounded-[10px] overflow-hidden ${isMultiSelecting ? '' : 'cursor-pointer'}`}
                              onClick={() => {
                                if (isMultiSelecting) return;
                                setExpandedVoiceMsgIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(msg.id)) next.delete(msg.id);
                                  else next.add(msg.id);
                                  return next;
                                });
                              }}
                              onPointerDown={() => { if (!isMultiSelecting) startLongPress(msg); }}
                              onPointerUp={() => { if (!isMultiSelecting) cancelLongPress(); }}
                              onPointerLeave={() => { if (!isMultiSelecting) cancelLongPress(); }}
                              onPointerCancel={() => { if (!isMultiSelecting) cancelLongPress(); }}
                              onContextMenu={(e: any) => { e.preventDefault(); if (!isMultiSelecting) cancelLongPress(); }}
                            >
                              {/* 语音气泡主体 */}
                              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-[10px] min-w-[80px] max-w-[200px] active:brightness-95 transition-all ${msg.isMe ? 'bg-[#95EC69] flex-row-reverse' : 'bg-white'}`}>
                                <span className="text-[14px] font-medium text-gray-700 shrink-0">{duration}"</span>
                                <svg width="20" height="16" viewBox="0 0 20 16" fill="none" className={`shrink-0 ${msg.isMe ? 'scale-x-[-1]' : ''}`}>
                                  <rect x="0" y="5" width="3" height="6" rx="1.5" fill="#666" opacity="0.5"/>
                                  <rect x="5" y="2.5" width="3" height="11" rx="1.5" fill="#666" opacity="0.7"/>
                                  <rect x="10" y="0" width="3" height="16" rx="1.5" fill="#666"/>
                                  <rect x="15" y="2.5" width="3" height="11" rx="1.5" fill="#666" opacity="0.7"/>
                                </svg>
                              </div>
                              {/* 展开内容 */}
                              {isExpanded && (
                                <div className={`mt-1 px-4 py-2.5 text-[14px] text-gray-700 leading-relaxed rounded-[10px] ${msg.isMe ? 'bg-[#95EC69]' : 'bg-white'}`}>
                                  {voiceText}
                                </div>
                              )}
                            </div>
                          );
                        } else if (isImage) {
                          const desc = isImage[1];
                          // 判断是否为真实图片 URL 或 base64（以 http/https/data: 开头）
                          const isRealImage = /^(https?:\/\/|data:image\/)/.test(desc);
                          content = (
                            <div 
                              className={`rounded-[10px] overflow-hidden select-none bg-transparent flex items-center justify-center ${isMultiSelecting ? '' : 'cursor-pointer active:brightness-95'}`}
                              style={{ maxWidth: '120px', maxHeight: '120px', minWidth: '40px', minHeight: '40px' }}
                              onClick={() => { if (!isMultiSelecting && !isRealImage) setViewingImageDesc(desc); }}
                              onPointerDown={() => { if (!isMultiSelecting) startLongPress(msg); }}
                              onPointerUp={() => { if (!isMultiSelecting) cancelLongPress(); }}
                              onPointerLeave={() => { if (!isMultiSelecting) cancelLongPress(); }}
                              onPointerCancel={() => { if (!isMultiSelecting) cancelLongPress(); }}
                              onContextMenu={(e: any) => { e.preventDefault(); if (!isMultiSelecting) cancelLongPress(); }}
                            >
                              {isRealImage ? (
                                <img
                                  src={desc}
                                  alt="图片"
                                  style={{ maxWidth: '120px', maxHeight: '120px', display: 'block', objectFit: 'contain' }}
                                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                                />
                              ) : (
                                <div className="w-[100px] h-[100px] bg-[#e8e8e8] flex flex-col items-center justify-center gap-1.5 rounded-[10px]">
                                  <ImageIcon size={28} className="text-gray-400" strokeWidth={1.2} />
                                  {desc && <span className="text-[11px] text-gray-500 px-2 text-center leading-snug line-clamp-2">{desc}</span>}
                                </div>
                              )}
                            </div>
                          );
                        } else if (isRedPacket) {
                          const title = text.slice(5) || '大吉大利，万事如意';
                          content = (
                            <div 
                              className={`w-[240px] rounded-[10px] overflow-hidden select-none bg-[#f9a23c] flex flex-col ${isMultiSelecting ? '' : 'cursor-pointer active:brightness-95'}`}
                              onPointerDown={() => { if (!isMultiSelecting) startLongPress(msg); }}
                              onPointerUp={() => { if (!isMultiSelecting) cancelLongPress(); }}
                              onPointerLeave={() => { if (!isMultiSelecting) cancelLongPress(); }}
                              onPointerCancel={() => { if (!isMultiSelecting) cancelLongPress(); }}
                              onContextMenu={(e: any) => { e.preventDefault(); if (!isMultiSelecting) cancelLongPress(); }}
                            >
                              <div className="px-4 py-4 flex items-center gap-3">
                                 <div className="w-[34px] h-[42px] bg-[#f35543] rounded-[4px] relative shrink-0 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
                                   <div className="absolute top-0 w-[150%] h-[40%] left-[-25%] bg-[#ec4e3d] rounded-b-[50%] shadow-[0_1px_1px_rgba(0,0,0,0.1)] z-0"></div>
                                   <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[15px] h-[15px] bg-[#f5cf74] rounded-full z-10 flex items-center justify-center font-bold text-[#e34433] text-[9px] shadow-[0_1px_2px_rgba(0,0,0,0.2)]">¥</div>
                                 </div>
                                 <div className="text-white text-[16px] truncate">{title}</div>
                              </div>
                              <div className="px-4 pb-1.5">
                                <div className="border-t border-white/20 pt-[3px] text-[11px] text-white/80">
                                  微信红包
                                </div>
                              </div>
                            </div>
                          );
                        } else if (isTransfer) {
                          const match = text.match(/^\[TRANSFER:(.*?):(.*?):(SENT|ACCEPTED|REJECTED)\]$/);
                          const amount = match ? match[1] : '';
                          const title = match ? match[2] : '';
                          const status = match ? match[3] : 'SENT';
                          const bgClass = status === 'ACCEPTED' || status === 'REJECTED' ? 'bg-[#fbc589]' : 'bg-[#f9a23c]';
                          content = (
                            <div 
                              className={`w-[240px] rounded-[10px] overflow-hidden select-none ${bgClass} flex flex-col ${isMultiSelecting ? '' : 'cursor-pointer active:brightness-95'}`}
                              onPointerDown={() => { if (!isMultiSelecting) startLongPress(msg); }}
                              onPointerUp={() => { if (!isMultiSelecting) cancelLongPress(); }}
                              onPointerLeave={() => { if (!isMultiSelecting) cancelLongPress(); }}
                              onPointerCancel={() => { if (!isMultiSelecting) cancelLongPress(); }}
                              onContextMenu={(e: any) => { e.preventDefault(); if (!isMultiSelecting) cancelLongPress(); }}
                              onClick={() => {
                                 if (!isMultiSelecting && status === 'SENT' && !msg.isMe) {
                                    setTransferActionMsg({...msg, amount, title});
                                 }
                              }}
                            >
                              <div className="px-4 py-4 flex items-center gap-4">
                                 <div className="w-[38px] h-[38px] border-[2px] border-white rounded-full flex items-center justify-center shrink-0">
                                   <ArrowRightLeft className="text-white" size={20} strokeWidth={2} />
                                 </div>
                                 <div className="text-white flex flex-col justify-center">
                                   <span className="text-[17px] font-medium">¥{amount}</span>
                                   {title && title !== '微信转账' && title !== '转账' && (
                                     <span className="text-[13px] opacity-90 mt-0.5">{title}</span>
                                   )}
                                 </div>
                              </div>
                              <div className="px-4 pb-1.5">
                                <div className="border-t border-white/20 pt-[3px] text-[11px] text-white/80">
                                  {status === 'ACCEPTED' ? (msg.isMe ? '对方已收钱' : '已收钱') : status === 'REJECTED' ? (msg.isMe ? '对方已退还' : '已退还') : '微信转账'}
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        return (
                          <div key={gIdx} className={`flex items-start gap-3 w-full my-1 ${msg.isMe ? 'flex-row-reverse' : ''} ${isMultiSelecting ? 'pl-8' : ''}`}>
                            <div className="w-10 h-10 bg-gray-200 rounded-[6px] flex items-center justify-center overflow-hidden shrink-0 mt-0.5">
                               {msg.isMe ? (
                                 (friend.my_bound_avatar || myAvatar) ? <img src={(friend.my_bound_avatar || myAvatar) as string} alt="" className="w-full h-full object-cover" /> : <User size={20} className="text-gray-400" />
                               ) : (
                                 friend.avatar ? <img src={friend.avatar} alt="" className="w-full h-full object-cover" /> : <User size={20} className="text-gray-400" />
                               )}
                            </div>
                            <div className={`max-w-[70%] flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
                               {content}
                            </div>
                          </div>
                        );
                    } else {
                        return (
                          <div key={gIdx} className={`flex items-start gap-3 w-full my-1 ${msg.isMe ? 'flex-row-reverse' : ''} ${isMultiSelecting ? 'pl-8' : ''}`}>
                            <div className="w-10 h-10 bg-gray-200 rounded-[6px] flex items-center justify-center overflow-hidden shrink-0 mt-0.5">
                               {msg.isMe ? (
                                 (friend.my_bound_avatar || myAvatar) ? <img src={(friend.my_bound_avatar || myAvatar) as string} alt="" className="w-full h-full object-cover" /> : <User size={20} className="text-gray-400" />
                               ) : (
                                 friend.avatar ? <img src={friend.avatar} alt="" className="w-full h-full object-cover" /> : <User size={20} className="text-gray-400" />
                               )}
                            </div>
                            <div className={`max-w-[70%] flex flex-col gap-2 ${msg.isMe ? 'items-end' : 'items-start'}`}>
                               {group.parts.map((p: any, pIdx: number) => {
                                  const showDot = showMindCardSetting && !msg.isMe && extractedMindCard && pIdx === group.parts.length - 1;
                                  const showCotBubble = !msg.isMe && isCotMsg && showCotDisplaySetting && isLastGroup && pIdx === group.parts.length - 1;
                                  return (
                                     <>
                                     {showCotBubble && (
                                       <button
                                        onClick={() => setViewingCotContent(lastAiCotContent)}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-white rounded-[14px] text-[12px] text-gray-400 active:bg-gray-100 transition-colors shadow-sm border border-gray-100 select-none mb-1 self-start"
                                       >
                                        <span className="text-[10px]">▷</span>
                                        <span className="text-[10px] opacity-60">↺</span>
                                        <span>思维链</span>
                                       </button>
                                     )}
                                     <div 
                                       key={pIdx}
                                       className={`relative px-4 py-2.5 w-fit rounded-[10px] text-[15px] ${msg.isMe ? 'bg-[#95EC69] text-black' : 'bg-white text-gray-800'} break-words select-none ${isMultiSelecting ? '' : 'cursor-pointer active:brightness-95'}`}
                                       style={{
                                          fontSize: bubbleFontSize ? `${bubbleFontSize}px` : undefined,
                                          color: bubbleColor || undefined
                                       }}
                                       onPointerDown={() => { if (!isMultiSelecting) startLongPress(msg); }}
                                      onPointerUp={() => { if (!isMultiSelecting) cancelLongPress(); }}
                                      onPointerLeave={() => { if (!isMultiSelecting) cancelLongPress(); }}
                                      onPointerCancel={() => { if (!isMultiSelecting) cancelLongPress(); }}
                                      onContextMenu={(e: any) => { e.preventDefault(); if (!isMultiSelecting) cancelLongPress(); }}
                                      onClick={() => {
                                        if (!isMultiSelecting && !msg.isMe && showMindCardSetting && extractedMindCard) {
                                           setViewingMindCard(extractedMindCard);
                                        }
                                      }}
                                    >
                                      {showDot && (
                                         <div className="absolute top-0 right-0 -mt-1 -mr-1 w-2.5 h-2.5 bg-pink-400 rounded-full shadow-[0_0_0_1.5px_white] z-10" />
                                      )}
                                      {msg.msgType === 'image' ? (
                                        <img src={msg.text} alt="图片消息" className="inner-bubble-image" />
                                      ) : (
                                        <span className="whitespace-pre-wrap">{p.text}</span>
                                      )}
                                    </div>
                                     </>
                                  );
                               })}
                               {quoteInfo && gIdx === groups.length - 1 && (
                                 <div 
                                   className="text-[12px] bg-black/5 text-[#888888] mt-1 px-2.5 py-1.5 rounded-[6px] text-left break-words w-fit max-w-full line-clamp-2 cursor-pointer"
                                   style={{
                                      fontSize: systemMsgFontSize ? `${systemMsgFontSize}px` : undefined,
                                      color: systemMsgColor || undefined
                                   }}
                                 >
                                   {quoteInfo}
                                 </div>
                               )}
                            </div>
                          </div>
                        );
                    }
                })}
              </div>
              </React.Fragment>
            );
          })
        })()}
      </div>

      {showConsoleAndTokenSetting && !isMultiSelecting && (
        <TokenBar friend={friend} messages={messages} consoleLogs={consoleLogs} onClearLogs={onClearConsoleLogs} />
      )}

      {/* Input Area / Multi-Select Bottom Bar */}
      {isMultiSelecting ? (
        <div className="bg-[#f7f7f7] border-t border-gray-200 px-3 py-3 shrink-0 pb-8 flex items-center justify-between min-h-[60px] relative">
          <button className="flex-1 flex flex-col items-center justify-center gap-1 active:bg-gray-200/50 py-2 rounded-lg text-gray-400">
             <MessageSquare size={22} className="text-gray-400" />
          </button>
          <button className="flex-1 flex flex-col items-center justify-center gap-1 active:bg-gray-200/50 py-2 rounded-lg text-gray-400">
             <Copy size={22} className="text-gray-400" />
          </button>
          <button 
             onClick={() => {
               if (selectedMsgIds.length > 0 && onDeleteMessages) {
                 onDeleteMessages(selectedMsgIds);
                 setIsMultiSelecting(false);
                 setSelectedMsgIds([]);
               }
             }}
             disabled={selectedMsgIds.length === 0}
             className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-lg ${selectedMsgIds.length > 0 ? 'text-[#333333] active:bg-gray-200/50 cursor-pointer' : 'text-gray-300 opacity-50'}`}
          >
             <Trash2 size={22} className="text-inherit" />
             <span className="text-[12px] font-medium text-inherit">删除</span>
          </button>
          <button className="flex-1 flex flex-col items-center justify-center gap-1 active:bg-gray-200/50 py-2 rounded-lg text-gray-400">
             <MapPin size={22} className="text-gray-400" />
          </button>
        </div>
      ) : (
        <div className="bg-[#f7f7f7] border-t border-gray-200 px-2 py-2 shrink-0 pb-6 flex items-end gap-1.5 min-h-[60px] relative">
          <AnimatePresence>
            {showPluginPanel && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowPluginPanel(false)}
                />
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full w-full left-0 px-3 pb-2 z-20"
                >
                  <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_15px_rgba(0,0,0,0.08)] border border-gray-100">
                    <div className="grid grid-cols-5 gap-y-5 px-1">
                      <button 
                         onClick={() => {
                           if (!offlineStartTime) {
                             const now = Date.now();
                             setOfflineStartTime(now);
                             localStorage.setItem(`wechat_offline_${friend.id}`, now.toString());
                             onSendMessage('「你向对方发起了线下见面邀请」', 'narrator');
                           } else {
                             setOfflineStartTime(null);
                             localStorage.removeItem(`wechat_offline_${friend.id}`);
                             onSendMessage('你们结束了线下见面', 'narrator');
                           }
                           setShowPluginPanel(false);
                         }}
                         className="flex flex-col items-center gap-1.5"
                      >
                         <div className="w-10 h-10 bg-[#f4f5f7] rounded-[14px] flex items-center justify-center active:bg-gray-200 transition-colors">
                           <MapPin className="text-[#64748b]" size={20} strokeWidth={1.5} />
                         </div>
                         <span className="text-[11px] text-gray-500 font-medium">线下</span>
                      </button>
                      <button 
                         onClick={() => {
                           setShowPluginPanel(false);
                           setMoneyAmount('');
                           setMoneyTitle('');
                           setShowTransferModal(true);
                         }}
                         className="flex flex-col items-center gap-1.5"
                      >
                         <div className="w-10 h-10 bg-[#f4f5f7] rounded-[14px] flex items-center justify-center active:bg-gray-200 transition-colors">
                           <ArrowRightLeft className="text-[#64748b]" size={20} strokeWidth={1.5} />
                         </div>
                         <span className="text-[11px] text-gray-500 font-medium">转账</span>
                      </button>
                      <button 
                         onClick={() => {
                           setShowPluginPanel(false);
                           setMoneyAmount('');
                           setMoneyTitle('');
                           setShowRedPacketModal(true);
                         }}
                         className="flex flex-col items-center gap-1.5"
                      >
                         <div className="w-10 h-10 bg-[#f4f5f7] rounded-[14px] flex items-center justify-center active:bg-gray-200 transition-colors">
                           <Gift className="text-[#64748b]" size={20} strokeWidth={1.5} />
                         </div>
                         <span className="text-[11px] text-gray-500 font-medium">红包</span>
                      </button>
                      <button 
                        onClick={() => {
                          setShowPluginPanel(false);
                          setImageDesc('');
                          setShowImageDescModal(true);
                        }}
                        className="flex flex-col items-center gap-1.5"
                      >
                        <div className="w-10 h-10 bg-[#f4f5f7] rounded-[14px] flex items-center justify-center active:bg-gray-200 transition-colors">
                          <ImageIcon className="text-[#64748b]" size={20} strokeWidth={1.5} />
                        </div>
                        <span className="text-[11px] text-gray-500 font-medium">相册</span>
                      </button>

                      <button 
                        onClick={() => {
                          setShowPluginPanel(false);
                          visionFileInputRef.current?.click();
                        }}
                        className="flex flex-col items-center gap-1.5"
                      >
                        <div className="w-10 h-10 bg-[#f4f5f7] rounded-[14px] flex items-center justify-center active:bg-gray-200 transition-colors">
                          <Camera className="text-[#64748b]" size={20} strokeWidth={1.5} />
                        </div>
                        <span className="text-[11px] text-gray-500 font-medium">拍照</span>
                      </button>
                      <button 
                         onClick={() => {
                           setShowPluginPanel(false);
                           setLinkedWorldbooks(friend?.linkedWorldbooks || friend?.linked_worldbooks || []);
                           setAllWorldbooks(() => {
                             try {
                               const saved = localStorage.getItem('os_worldbooks');
                               return saved ? JSON.parse(saved) : [];
                             } catch { return []; }
                           });
                           setShowWorldbookSelect(true);
                         }}
                         className="flex flex-col items-center gap-1.5"
                      >
                         <div className="w-10 h-10 bg-[#f4f5f7] rounded-[14px] flex items-center justify-center active:bg-gray-200 transition-colors">
                           <Folder className="text-[#64748b]" size={20} strokeWidth={1.5} />
                         </div>
                         <span className="text-[11px] text-gray-500 font-medium">速切世界书</span>
                      </button>
                      <button 
                         onClick={async () => {
                           setShowPluginPanel(false);
                           
                           let idsToDelete: number[] = [];
                           let i = messages.length - 1;
                           // 删除最后一轮完整的AI回复（包括旁白和气泡，直到遇到用户消息或系统消息）
                           while (i >= 0 && !messages[i].isMe && messages[i].msgType !== 'system') {
                             if (messages[i].id != null) idsToDelete.push(messages[i].id);
                             i--;
                           }
                           
                           if (idsToDelete.length > 0 && onDeleteMessages) {
                               // 等待数据库删除和 state 更新完成后再触发 AI
                               await onDeleteMessages(idsToDelete);
                           }
                           
                           if (onTriggerAI && !isTyping) {
                               onTriggerAI();
                           }
                         }}
                         className="flex flex-col items-center gap-1.5"
                      >
                         <div className="w-10 h-10 bg-[#f4f5f7] rounded-[14px] flex items-center justify-center active:bg-gray-200 transition-colors">
                           <RefreshCcw className="text-[#64748b]" size={20} strokeWidth={1.5} />
                         </div>
                         <span className="text-[11px] text-gray-500 font-medium">重回</span>
                      </button>
       <button 
          onClick={() => {
            setShowPluginPanel(false);
            setShowWoYuModal(true);
          }}
          className="flex flex-col items-center gap-1.5"
       >
          <div className="w-10 h-10 bg-[#f4f5f7] rounded-[14px] flex items-center justify-center active:bg-gray-200 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 19h18" />
              <path d="M3 19L6 9l4.5 4L12 5l1.5 8L18 9l3 10" />
            </svg>
          </div>
          <span className="text-[11px] text-gray-500 font-medium">我控！</span>
       </button>
                      <button 
                         onClick={() => {
                           setShowPluginPanel(false);
                           onSendMessage('「发起了视频通话」', 'system');
                         }}
                         className="flex flex-col items-center gap-1.5"
                      >
                         <div className="w-10 h-10 bg-[#f4f5f7] rounded-[14px] flex items-center justify-center active:bg-gray-200 transition-colors">
                           <Video className="text-[#64748b]" size={20} strokeWidth={1.5} />
                         </div>
                         <span className="text-[11px] text-gray-500 font-medium">视频</span>
                      </button>
                      <button 
                         onClick={async () => {
                           setShowPluginPanel(false);
                           setCallSeconds(0);
                           setCallStatus('calling');
                           setShowPhoneCall(true);

                           // 读取 API 配置
                           const apiUrl = (localStorage.getItem('os_api_url') || '').trim();
                           const apiKey = (localStorage.getItem('os_api_key') || '').trim();
                           const model = (localStorage.getItem('os_api_model') || '').trim();

                           if (!apiUrl || !apiKey || !model) {
                             // 无 API 配置，3 秒后模拟接听
                             callRejectTimerRef.current = setTimeout(() => {
                               setCallStatus('connected');
                               callTimerRef.current = setInterval(() => setCallSeconds(prev => prev + 1), 1000);
                             }, 3000);
                             return;
                           }

                           try {
                             let completionsUrl = apiUrl;
                             if (!completionsUrl.endsWith('/chat/completions')) {
                               completionsUrl = completionsUrl.endsWith('/')
                                 ? `${completionsUrl}chat/completions`
                                 : `${completionsUrl}/chat/completions`;
                             }
                             const validatedUrl = new URL(completionsUrl).toString();

                             // 构建完整上下文：世界书 + AI人设 + 用户设定 + 对方(AI)日程
                             const ai = friend;
                             const worldbookText = buildWorldbookText(ai);
                             const personaDesc = buildPersonaText(ai);

                             // 读取我的档案
                             const myPersonaRec = await AppDB.appSettings.get('my_persona');
                             const myProfileData = myPersonaRec?.value || {};
                             const myProfileText = buildMyProfileText(myProfileData);

                             // 读取"你我之间"对方(AI)的今日日程
                             const otherScheduleItems = loadOtherSchedule();
                             const nowDate = new Date();
                             const todayStr = `${nowDate.getFullYear()}.${nowDate.getMonth() + 1}.${nowDate.getDate()}`;
                             const todaySchedule = otherScheduleItems
                               .filter(item => item.date === todayStr)
                               .map(item => `${item.time}  ${item.text}`)
                               .join('\n');

                             const nowStr = nowDate.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

                             // 读取记忆海内容（核心记忆 + 近期记忆 + 了解你）
                             const allPlotMems = loadPlotMemories();
                             const coreMems = allPlotMems.filter(m => Number(m.importance) >= 8);
                             const cleanMems = allPlotMems.filter(m => Number(m.importance) < 8).slice(-10);
                             const allAboutYouMems = loadAboutYouEntries();

                             let memorySeaBlock = '';
                             if (coreMems.length > 0) {
                               memorySeaBlock += `【核心记忆】这些是你们之间最重要的记忆，必须牢记：\n${coreMems.map(m => `· [${m.date}][${m.theme}][重要度:${m.importance}] ${m.content}${m.emotion ? `（${m.emotion}）` : ''}`).join('\n')}\n`;
                             }
                             if (cleanMems.length > 0) {
                               memorySeaBlock += `\n【近期记忆】近期发生的一些事情：\n${cleanMems.map(m => `· [${m.date}][${m.theme}] ${m.content}${m.emotion ? `（${m.emotion}）` : ''}`).join('\n')}\n`;
                             }
                             if (allAboutYouMems.length > 0) {
                               memorySeaBlock += `\n【了解你】你了解关于对方的这些事：\n${allAboutYouMems.map(e => `· [${e.category}][关于${e.target}] ${e.key}：${e.value}`).join('\n')}\n`;
                             }
                             const memorySeaSection = memorySeaBlock
                               ? `【记忆海】以下是你记忆中储存的内容，来自你与对方的相处历程：\n${memorySeaBlock}`
                               : '';

                             const prompt = `你是${ai.wechat_remark || ai.name}，下面是你的完整档案与当前上下文：

【你的人设档案】
${personaDesc}

${worldbookText ? `【世界书背景知识】\n${worldbookText}\n` : ''}${myProfileText ? `【与你联系的用户档案】\n${myProfileText}\n` : ''}${memorySeaSection ? `${memorySeaSection}\n` : ''}${todaySchedule ? `【你今日的日程安排】\n${todaySchedule}\n` : ''}
【当前时间】${nowStr}

现在对方（用户）突然给你打来电话。请你完全代入自己的人设、当前时间、今日日程和当前状态，判断你此刻是否会接听这个电话。

只输出以下两种之一，不要任何其他内容：
[ACCEPT] 如果你会接听
[REJECT] 如果你不接听（忙线、睡着、不方便、日程冲突等）`;

                             const resp = await fetch(validatedUrl, {
                               method: 'POST',
                               headers: {
                                 'Content-Type': 'application/json',
                                 'Authorization': `Bearer ${apiKey}`,
                               },
                               body: JSON.stringify({
                                 model,
                                 messages: [{ role: 'user', content: prompt }],
                                 temperature: 0.7,
                                 stream: false,
                               }),
                             });

                             let aiReply = '';
                             if (resp.ok) {
                               const data = await resp.json();
                               aiReply = data?.choices?.[0]?.message?.content || '';
                             }

                             if (aiReply.includes('[ACCEPT]')) {
                               // 接听：2-4 秒后状态变为通话中，接通后触发通话专用 AI 对话
                               const delay = 2000 + Math.random() * 2000;
                               callRejectTimerRef.current = setTimeout(async () => {
                                 setCallStatus('connected');
                                 callTimerRef.current = setInterval(() => setCallSeconds(prev => prev + 1), 1000);
                                 // 触发通话专用提示词：发送系统消息给 AI，让 AI 以语音通话格式回复
                                 onSendMessage('[PHONE_CALL_START]', 'system');
                               }, delay);
                             } else {
                               // 不接：3-6 秒后自动挂断
                               const delay = 3000 + Math.random() * 3000;
                               callRejectTimerRef.current = setTimeout(() => {
                                 setCallStatus('rejected');
                                 setTimeout(() => {
                                   onSendMessage('「对方未接听」', 'system');
                                   setShowPhoneCall(false);
                                   setCallSeconds(0);
                                   setCallStatus('calling');
                                 }, 1500);
                               }, delay);
                             }
                           } catch (_e) {
                             // 网络错误，3 秒后默认接听
                             callRejectTimerRef.current = setTimeout(() => {
                               setCallStatus('connected');
                               callTimerRef.current = setInterval(() => setCallSeconds(prev => prev + 1), 1000);
                             }, 3000);
                           }
                         }}
                         className="flex flex-col items-center gap-1.5"
                      >
                         <div className="w-10 h-10 bg-[#f4f5f7] rounded-[14px] flex items-center justify-center active:bg-gray-200 transition-colors">
                           <Phone className="text-[#64748b]" size={20} strokeWidth={1.5} />
                         </div>
                         <span className="text-[11px] text-gray-500 font-medium">电话</span>
                      </button>
                      <button 
                         onClick={() => {
                           setShowPluginPanel(false);
                           onSendMessage('「进入了梦境」', 'system');
                         }}
                         className="flex flex-col items-center gap-1.5"
                      >
                         <div className="w-10 h-10 bg-[#f4f5f7] rounded-[14px] flex items-center justify-center active:bg-gray-200 transition-colors">
                           <CloudMoon className="text-[#64748b]" size={20} strokeWidth={1.5} />
                         </div>
                         <span className="text-[11px] text-gray-500 font-medium">梦境</span>
                      </button>
                      <button 
                         onClick={() => {
                           setShowPluginPanel(false);
                           onSendMessage('「发送了位置」', 'system');
                         }}
                         className="flex flex-col items-center gap-1.5"
                      >
                         <div className="w-10 h-10 bg-[#f4f5f7] rounded-[14px] flex items-center justify-center active:bg-gray-200 transition-colors">
                           <Navigation className="text-[#64748b]" size={20} strokeWidth={1.5} />
                         </div>
                         <span className="text-[11px] text-gray-500 font-medium">位置</span>
                      </button>
                      <button 
                         onClick={() => {
                           setShowPluginPanel(false);
                           onSendMessage('「打开了衣帽间」', 'system');
                         }}
                         className="flex flex-col items-center gap-1.5"
                      >
                         <div className="w-10 h-10 bg-[#f4f5f7] rounded-[14px] flex items-center justify-center active:bg-gray-200 transition-colors">
                           <Shirt className="text-[#64748b]" size={20} strokeWidth={1.5} />
                         </div>
                         <span className="text-[11px] text-gray-500 font-medium">衣帽间</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <input 
            type="file" 
            id="wechat-camera-input" 
            accept="image/*" 
            className="hidden" 
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) {
                const file = files[0];
                const reader = new FileReader();
                reader.onload = (ev) => {
                  onSendMessage(ev.target?.result as string, 'image');
                };
                reader.readAsDataURL(file);
              }
              e.target.value = '';
            }}
          />

          {/* 隐藏的视觉识图文件输入 */}
          <input
            type="file"
            accept="image/png, image/jpeg"
            ref={visionFileInputRef}
            style={{ display: 'none' }}
            onChange={async (e) => {
              const files = e.target.files;
              if (!files || files.length === 0) return;
              const file = files[0];
              try {
                // 统一压缩为 JPEG 格式，避免 MIME type 不匹配（PNG 前缀 + JPEG 内容）
                const compressedBase64 = await compressImage(file, {
                  maxWidth: 800,
                  maxHeight: 800,
                  quality: 0.6,
                  outputType: 'image/jpeg',
                });
                // 聊天界面展示和传给 AI 都使用压缩后的 JPEG base64
                onSendMessage(compressedBase64, 'image');
                console.log('[Vision] 压缩后长度:', compressedBase64.length);

                // 读取用户配置的 API 信息（优先从全局设置读取）
                const apiUrl = (localStorage.getItem('os_api_url') || '').trim();
                const apiKey = (localStorage.getItem('os_api_key') || '').trim();
                const model = (localStorage.getItem('os_api_model') || '').trim();

                // 调用视觉识别接口（使用压缩后的图片）
                const result = await analyzeImage(compressedBase64, {
                  prompt: '请用中文描述这张图片的内容',
                  apiUrl: apiUrl || undefined,
                  apiKey: apiKey || undefined,
                  model: model || undefined,
                });

                // 将 AI 识别结果作为对方的回复消息
                onSendMessage(result, 'text');
              } catch (err: any) {
                console.error('Vision analysis failed:', err);
                onSendMessage(`[图片识别失败: ${err?.message || '未知错误'}]`, 'system');
              } finally {
                // 清空 input 状态以便下次选择
                if (visionFileInputRef.current) {
                  visionFileInputRef.current.value = '';
                }
              }
            }}
          />

          <button 
            onClick={() => setShowPluginPanel(!showPluginPanel)}
            className="text-gray-500 p-1 shrink-0 mb-1"
          >
            <div className="w-[26px] h-[26px] rounded-full border-2 border-gray-500 flex items-center justify-center">
              <Plus size={16} strokeWidth={2.5} />
            </div>
          </button>
          <div className={`relative flex-1 min-h-[40px] bg-white rounded-md flex flex-col justify-center px-3 py-1 border overflow-hidden mb-1 ${isNarratorMode ? 'border-pink-300 bg-pink-50/30' : 'border-gray-200'}`}>
            {quotedMessage && (
              <div className="w-full flex items-center justify-between bg-gray-100 rounded-[4px] px-2 py-1 mb-1 mt-1">
                <span className="text-[12px] text-gray-500 truncate mr-2">
                  {(() => {
                      let coreText = quotedMessage.text;
                      if (coreText.match(/^「(.*?)」\n- - - - - - - - - - - - - - -\n([\s\S]*)$/)) {
                          coreText = coreText.match(/^「(.*?)」\n- - - - - - - - - - - - - - -\n([\s\S]*)$/)[2];
                      } else if (coreText.match(/^\[引用:(.*?)\]\n([\s\S]*)$/)) {
                          coreText = coreText.match(/^\[引用:(.*?)\]\n([\s\S]*)$/)[2];
                      }
                      
                      const display = coreText.startsWith('[红包]') ? '[红包]' : 
                                      coreText.startsWith('[TRANSFER:') ? '[转账]' : 
                                      quotedMessage.msgType === 'image' ? '[图片]' : 
                                      quotedMessage.msgType === 'voice' ? '[语音]' : 
                                      coreText;
                      return `${quotedMessage.isMe ? '我' : (friend.wechat_remark || friend.name)}: ${display.length > 50 ? display.substring(0, 50) + '...' : display}`;
                  })()}
                </span>
                <button onClick={() => setQuotedMessage(null)} className="text-gray-400 p-0.5 hover:bg-gray-200 rounded shrink-0">
                  <X size={12} strokeWidth={2} />
                </button>
              </div>
            )}
            <div className="flex items-end">
              <textarea 
                ref={textareaRef}
                placeholder={isNarratorMode ? "请输入旁白..." : "请输入消息..."}
                value={inputText}
                onChange={e => {
                  setInputText(e.target.value);
                  // 自动调整高度
                  const el = textareaRef.current;
                  if (el) {
                    el.style.height = 'auto';
                    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (inputText.trim()) {
                      let finalText = inputText.trim();
                      if (quotedMessage) {
                         const quoteName = quotedMessage.isMe ? '我' : (friend.wechat_remark || friend.name);
                         let coreText = quotedMessage.text;
                         if (coreText.match(/^「(.*?)」\n- - - - - - - - - - - - - - -\n([\s\S]*)$/)) {
                             coreText = coreText.match(/^「(.*?)」\n- - - - - - - - - - - - - - -\n([\s\S]*)$/)[2];
                         } else if (coreText.match(/^\[引用:(.*?)\]\n([\s\S]*)$/)) {
                             coreText = coreText.match(/^\[引用:(.*?)\]\n([\s\S]*)$/)[2];
                         }
                         const quoteContent = coreText.startsWith('[红包]') ? '[红包]' : 
                                              coreText.startsWith('[TRANSFER:') ? '[转账]' : 
                                              quotedMessage.msgType === 'image' ? '[图片]' : 
                                              quotedMessage.msgType === 'voice' ? '[语音]' : 
                                              coreText;
                         finalText = `「${quoteName}: ${quoteContent}」\n- - - - - - - - - - - - - - -\n${finalText}`;
                      }
                      onSendMessage(finalText, isNarratorMode ? 'narrator' : 'text');
                      setInputText('');
                      setQuotedMessage(null);
                      // 发送后重置高度
                      const el = textareaRef.current;
                      if (el) {
                        el.style.height = 'auto';
                      }
                    }
                  }
                }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                rows={1}
                style={{ minHeight: '24px', maxHeight: '120px', overflow: 'auto' }}
                className="flex-1 text-[15px] bg-transparent outline-none resize-none leading-[24px] pr-1"
              />
              {/* 语音按钮 - 输入框内右侧 */}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setVoiceInput(''); setShowVoiceModal(true); }}
                className="shrink-0 ml-1 mb-0.5 p-0.5 text-gray-400 active:scale-95 transition-transform"
                title="语音输入"
              >
                <div className="w-[22px] h-[22px] rounded-full border border-gray-400 flex items-center justify-center">
                  <Mic size={13} strokeWidth={2} />
                </div>
              </button>
            </div>
          </div>
          
          {/* 表情包按钮（在线模式）/ 铅笔旁白切换按钮（线下模式） */}
          {!!offlineStartTime ? (
            <div className="flex items-center gap-0.5 shrink-0">
              {/* 向左箭头：打开我控弹窗 */}
              <button
                className="mb-1 p-1 text-gray-500 active:scale-95 transition-transform"
                onClick={() => setShowWoYuModal(true)}
                title="我控道具"
              >
                <ChevronLeft size={20} strokeWidth={2} />
              </button>
              {/* 铅笔：旁白模式切换 */}
              <button
                className={`mb-1 p-1 active:scale-95 transition-transform ${isNarratorMode ? 'text-pink-400' : 'text-gray-500'}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsNarratorMode(!isNarratorMode);
                }}
              >
                <div className={`w-[26px] h-[26px] rounded-full border-2 flex items-center justify-center transition-colors ${isNarratorMode ? 'border-pink-400 bg-pink-50' : 'border-gray-500'}`}>
                   <Edit2 size={14} strokeWidth={2.5} className="text-inherit" />
                </div>
              </button>
            </div>
          ) : (
            <div className="relative">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowStickerPanel(!showStickerPanel)}
                className="shrink-0 mb-1 p-1 text-gray-500 active:scale-95 transition-transform relative"
                title="表情"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2.5" />
                  <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2.5" />
                </svg>
              </button>
            </div>
          )}

          {/* 表情包面板 */}
          <AnimatePresence>
            {showStickerPanel && (
              <StickerPanel
                onClose={() => setShowStickerPanel(false)}
                onSendSticker={async (stickerUrl) => {
                  // 1. 先在聊天中展示表情包
                  onSendMessage(`[image:${stickerUrl}]`);

                  // 2. 将图片转成 base64 并调用 AI 识图
                  try {
                    const base64 = await compressImage(stickerUrl, { maxWidth: 400, maxHeight: 400, quality: 0.7 });
                    const desc = await analyzeImage(base64, {
                      prompt: '这是用户发送的一张表情包。请完成以下两件事：①识别并完整列出图中出现的所有文字；②用一句话描述这张表情包所表达的情绪或含义。格式：【图中文字】: xxx（无文字则写"无"）\n【表情包含义】: xxx',
                    });
                    // 3. 把识别结果作为系统消息注入，让 AI 明白用户发了什么
                    onSendMessage(`[用户发送了一张表情包，AI识图结果：${desc}]`, 'system');
                  } catch (err) {
                    console.warn('[Sticker Vision] 识图失败:', err);
                    // 识图失败不阻断流程，仍然发一条简短提示
                    onSendMessage('[用户发送了一张表情包]', 'system');
                  }
                }}
              />
            )}
          </AnimatePresence>

          {/* 发送键（聚焦）/ Heart+语音（失焦） */}
          {inputFocused ? (
            <button 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (inputText.trim()) {
                  let finalText = inputText.trim();
                  if (quotedMessage) {
                    const quoteName = quotedMessage.isMe ? '我' : (friend.wechat_remark || friend.name);
                    let coreText = quotedMessage.text;
                    if (coreText.match(/^「(.*?)」\n- - - - - - - - - - - - - - -\n([\s\S]*)$/)) {
                        coreText = coreText.match(/^「(.*?)」\n- - - - - - - - - - - - - - -\n([\s\S]*)$/)[2];
                    } else if (coreText.match(/^\[引用:(.*?)\]\n([\s\S]*)$/)) {
                        coreText = coreText.match(/^\[引用:(.*?)\]\n([\s\S]*)$/)[2];
                    }
                    const quoteContent = coreText.startsWith('[红包]') ? '[红包]' : 
                                         coreText.startsWith('[TRANSFER:') ? '[转账]' : 
                                         quotedMessage.msgType === 'image' ? '[图片]' : 
                                         quotedMessage.msgType === 'voice' ? '[语音]' : 
                                         coreText;
                    finalText = `「${quoteName}: ${quoteContent}」\n- - - - - - - - - - - - - - -\n${finalText}`;
                  }
                  onSendMessage(finalText, isNarratorMode ? 'narrator' : 'text');
                  setInputText('');
                  setQuotedMessage(null);
                }
              }}
              className="text-gray-500 shrink-0 mb-1 p-1 active:scale-95 transition-transform"
            >
              <Send size={24} strokeWidth={1.5} />
            </button>
          ) : (
            <>
              {/* Heart：触发AI回复 */}
              <button
                className="text-gray-500 shrink-0 mb-1 p-1 active:scale-95 transition-transform"
                onClick={() => { if (onTriggerAI) onTriggerAI(); }}
                title="触发AI回复"
              >
                <Heart size={26} strokeWidth={1.5} />
              </button>

            </>
          )}
        </div>
      )}
    </motion.div>
    <AnimatePresence>
      {viewingCotContent !== null && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewingCotContent(null)}
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[90]"
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[100] bg-white rounded-t-[20px] shadow-[0_-4px_24px_rgba(0,0,0,0.12)] flex flex-col max-h-[75vh]"
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <button
                onClick={() => setViewingCotContent(null)}
                className="flex items-center gap-1.5 text-[14px] text-gray-500 active:text-gray-700"
              >
                <span className="text-[12px]">▼</span>
                <span className="text-[12px] opacity-60">↺</span>
                <span>隐藏思维链</span>
              </button>
              <button onClick={() => setViewingCotContent(null)} className="text-gray-400 active:text-gray-600 p-1 -mr-1">
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto px-5 py-4 no-scrollbar">
              <p className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                {viewingCotContent}
              </p>
            </div>
          </motion.div>
        </>
      )}

      {viewingMindCard && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewingMindCard(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[90]"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
            className="fixed top-1/2 left-1/2 w-[85%] bg-gradient-to-br from-pink-50/95 to-white/95 backdrop-blur-xl border border-pink-100/50 rounded-[20px] shadow-[0_8px_32px_rgba(255,192,203,0.15)] z-[100] flex flex-col pt-6 pb-6 overflow-hidden max-h-[80vh]"
          >
            <div className="flex justify-between items-center px-6 mb-5 shrink-0">
              <span className="text-[17px] font-medium text-gray-800">TA 的心声</span>
              <button onClick={() => setViewingMindCard(null)} className="text-gray-400 active:text-gray-600 transition-colors p-1 -mr-1">
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 flex flex-col gap-3 no-scrollbar pb-2">
              {[
                { key: 'attire', label: '衣着打扮', icon: '🤍' },
                { key: 'action', label: '行为动作', icon: '🩶' },
                { key: 'thought', label: '真实心声', icon: '🖤' },
                { key: 'dark_side', label: '阴暗面', icon: '👁️' }
              ].map(item => {
                 const content = viewingMindCard[item.key] || (item.key === 'dark_side' ? viewingMindCard['dark side'] : null);
                 if (!content) return null;
                 return (
                   <div key={item.key} className="bg-white/50 backdrop-blur-md rounded-[14px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-white/60">
                     <div className="flex items-center gap-2 mb-2 text-[15px] font-medium text-gray-700">
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                     </div>
                     <div className="text-[14px] text-gray-600 leading-relaxed">
                        {content}
                     </div>
                   </div>
                 );
              })}
            </div>
          </motion.div>
        </>
      )}

      {showSettings && (
        <ChatSettingsScreen 
          key="chatSettings" 
          friend={friend} 
          onBack={() => setShowSettings(false)} 
          onSetRemark={(remark) => onSetRemark && onSetRemark(remark)}
          onSetWallpaper={handleSetWallpaper}
          onClearChat={() => {
            if (onClearChat) onClearChat();
            setShowSettings(false);
          }}
          onShowCotDisplayChange={(val) => setShowCotDisplaySetting(val)}
        />
      )}
    </AnimatePresence>
    <AnimatePresence>
      {showTimestampMenu && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTimestampMenu(false)}
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
              {timestampLongPressMsg && (
                <button
                  onClick={() => {
                    if (timestampLongPressMsg.fullTimestamp || timestampLongPressMsg.timestamp) {
                      const timestampToHide = timestampLongPressMsg.fullTimestamp ?? timestampLongPressMsg.timestamp;
                      setHiddenTimestamps(prev => new Set(prev).add(timestampToHide));
                    }
                    setShowTimestampMenu(false);
                    setTimestampLongPressMsg(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-[15px] active:bg-gray-200/50 bg-white"
                >
                  <Trash2 size={18} className="text-[#ee0a24]" />
                  <span className="text-[16px] text-[#ee0a24] font-medium">删除</span>
                </button>
              )}
            </div>
            <button 
              onClick={() => setShowTimestampMenu(false)}
              className="w-full py-[15px] bg-white rounded-[14px] text-[16px] font-medium text-[#4B79B5] active:bg-gray-100"
            >
              取消
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
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
              <button onClick={() => {
                setQuotedMessage(actionMenuMsg);
                setActionMenuMsg(null);
              }} className="w-full flex items-center justify-center gap-2 py-[15px] border-b border-gray-200/60 active:bg-gray-200/50 bg-white">
                <MessageSquare size={18} className="text-[#333333]" />
                <span className="text-[16px] text-[#333333]">引用</span>
              </button>
              <button 
                onClick={() => {
                  try { navigator.clipboard.writeText(actionMenuMsg.text); } catch(e) {}
                  setActionMenuMsg(null);
                }} 
                className="w-full flex items-center justify-center gap-2 py-[15px] border-b border-gray-200/60 active:bg-gray-200/50 bg-white"
              >
                <Copy size={18} className="text-[#333333]" />
                <span className="text-[16px] text-[#333333]">复制</span>
              </button>
              {actionMenuMsg.isMe && actionMenuMsg.msgType !== 'narrator' && (Date.now() - actionMenuMsg.timestamp < 3 * 60 * 1000) && (
                <button onClick={() => {
                  const elapsedSeconds = Math.floor((Date.now() - actionMenuMsg.timestamp) / 1000);
                  if (onDeleteMessages) onDeleteMessages([actionMenuMsg.id]);
                  onSendMessage('你撤回了一条消息', 'narrator', `${actionMenuMsg.text}[SECONDS:${elapsedSeconds}]`);
                  setActionMenuMsg(null);
                }} className="w-full flex items-center justify-center gap-2 py-[15px] border-b border-gray-200/60 active:bg-gray-200/50 bg-white">
                  <CornerUpLeft size={18} className="text-[#333333]" />
                  <span className="text-[16px] text-[#333333]">撤回</span>
                </button>
              )}
              {(!actionMenuMsg.msgType || actionMenuMsg.msgType === 'text' || actionMenuMsg.msgType === 'narrator' || actionMenuMsg.msgType === 'voice') && (
                <button onClick={() => {
                  setEditingMsg(actionMenuMsg);
                  let initialText = actionMenuMsg.text;
                  if (initialText.match(/^「(.*?)」\n- - - - - - - - - - - - - - -\n([\s\S]*)$/)) {
                     initialText = initialText.match(/^「(.*?)」\n- - - - - - - - - - - - - - -\n([\s\S]*)$/)[2];
                  } else if (initialText.match(/^\[引用:(.*?)\]\n([\s\S]*)$/)) {
                     initialText = initialText.match(/^\[引用:(.*?)\]\n([\s\S]*)$/)[2];
                  }
                  setEditingText(initialText);
                  setActionMenuMsg(null);
                }} className="w-full flex items-center justify-center gap-2 py-[15px] border-b border-gray-200/60 active:bg-gray-200/50 bg-white">
                  <Edit2 size={18} className="text-[#333333]" />
                  <span className="text-[16px] text-[#333333]">编辑</span>
                </button>
              )}
              <button onClick={() => {
                if (onDeleteMessages) onDeleteMessages([actionMenuMsg.id]);
                setActionMenuMsg(null);
              }} className="w-full flex items-center justify-center gap-2 py-[15px] border-b border-gray-200/60 active:bg-gray-200/50 bg-white">
                <Trash2 size={18} className="text-[#333333]" />
                <span className="text-[16px] text-[#333333]">删除</span>
              </button>
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
              className="w-full py-[15px] bg-white rounded-[14px] text-[16px] font-medium text-[#4B79B5] active:bg-gray-100"
            >
              取消
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {showTransferModal && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTransferModal(false)}
            className="fixed inset-0 bg-black/40 z-[100]"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
            className="fixed top-1/2 left-1/2 w-[85%] bg-white rounded-[16px] z-[110] flex flex-col overflow-hidden shadow-xl"
          >
            <div className="py-4 text-center border-b border-gray-100">
              <span className="text-[17px] font-medium text-gray-800">转账</span>
            </div>
            
            <div className="p-5 pb-6">
              <div className="mb-2 w-full flex">
                <span className="text-[14px] text-gray-500">转账金额（元）</span>
              </div>
              <input 
                type="number" 
                value={moneyAmount}
                onChange={e => setMoneyAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-[50px] px-4 bg-[#f7f7f7] rounded-[10px] text-[18px] text-gray-900 focus:outline-none mb-5"
                autoFocus
              />

              <div className="mb-2 w-full flex">
                <span className="text-[14px] text-gray-500">转账说明</span>
              </div>
              <input 
                type="text" 
                value={moneyTitle}
                onChange={e => setMoneyTitle(e.target.value)}
                placeholder="请输入转账说明（可选）"
                className="w-full h-[50px] px-4 bg-[#f7f7f7] rounded-[10px] text-[16px] text-gray-900 focus:outline-none mb-6 placeholder:text-gray-400"
              />
            
              <button 
                onClick={() => {
                  const amountNum = parseFloat(moneyAmount);
                  if (!amountNum || amountNum <= 0) {
                    alert('请输入有效金额');
                    return;
                  }
                  const bankBalance = bankCards.reduce((sum, card) => sum + card.balance, 0);
                  const totalBalance = walletBalance + bankBalance;
                  
                  if (totalBalance < amountNum) {
                    const shortage = (amountNum - totalBalance).toFixed(2);
                    alert(
                      `余额不足\n` +
                      `当前总余额: ¥${totalBalance.toFixed(2)}\n` +
                      `需要金额: ¥${amountNum.toFixed(2)}\n` +
                      `还差: ¥${shortage}`
                    );
                    return;
                  }
                  
                  if (walletBalance >= amountNum) {
                    setWalletBalance(walletBalance - amountNum);
                  } else {
                    let remaining = amountNum - walletBalance;
                    setWalletBalance(0);
                    const newBankCards = [...bankCards];
                    for (let i = 0; i < newBankCards.length && remaining > 0; i++) {
                      if (newBankCards[i].balance > 0) {
                        const deduct = Math.min(newBankCards[i].balance, remaining);
                        newBankCards[i].balance -= deduct;
                        remaining -= deduct;
                      }
                    }
                    setBankCards(newBankCards);
                  }

                  onSendMessage(`[TRANSFER:${moneyAmount}:${moneyTitle ? moneyTitle : '微信转账'}:SENT]`);
                  setShowTransferModal(false);
                }}
                disabled={!parseFloat(moneyAmount) || parseFloat(moneyAmount) <= 0}
                className={`w-full py-[14px] rounded-[10px] text-[16px] font-medium transition-colors ${parseFloat(moneyAmount) > 0 ? 'bg-[#07c160] text-white active:bg-[#06ad56]' : 'bg-[#f2f2f2] text-[#cccccc]'}`}
              >
                转账
              </button>
            </div>
          </motion.div>
        </>
      )}

      {editingMsg && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[120]"
            onClick={() => setEditingMsg(null)}
          />
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 bg-[#f7f7f7] rounded-t-[16px] z-[130] pb-8 flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <button className="text-[16px]" onClick={() => setEditingMsg(null)}>取消</button>
              <span className="font-medium">编辑消息</span>
              <button 
                className={`text-[16px] ${editingText.trim() ? 'text-[#07C160]' : 'text-gray-400'}`}
                onClick={() => {
                  if (editingText.trim() && onEditMessage) {
                    let finalNewText = editingText.trim();
                    const quoteMatch = editingMsg.text.match(/^「(.*?)」\n- - - - - - - - - - - - - - -\n([\s\S]*)$/);
                    const aiQuoteMatch = editingMsg.text.match(/^\[引用:(.*?)\]\n([\s\S]*)$/);
                    if (quoteMatch) {
                      finalNewText = `「${quoteMatch[1]}」\n- - - - - - - - - - - - - - -\n${finalNewText}`;
                    } else if (aiQuoteMatch) {
                      finalNewText = `[引用:${aiQuoteMatch[1]}]\n${finalNewText}`;
                    }
                    onEditMessage(editingMsg.id, finalNewText);
                    setEditingMsg(null);
                    if (navigator.vibrate) navigator.vibrate(50);
                  }
                }}
              >确认</button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <textarea 
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                autoFocus
                className="w-full h-32 bg-white rounded-lg p-3 text-[16px] outline-none resize-none"
                placeholder="请输入消息内容..."
              />
            </div>
          </motion.div>
        </>
      )}

      {recalledContentToShow && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[140]"
            onClick={() => setRecalledContentToShow(null)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300, mass: 0.8 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] max-w-[320px] bg-white rounded-xl z-[150] overflow-hidden flex flex-col"
          >
            <div className="p-5 flex-1 overflow-y-auto max-h-[60vh]">
               <div className="text-[15px] text-gray-800 whitespace-pre-wrap break-words">{recalledContentToShow}</div>
            </div>
            <div className="border-t border-gray-100 flex">
              <button 
                onClick={() => setRecalledContentToShow(null)}
                className="flex-1 py-3 text-[16px] font-medium text-gray-500 active:bg-gray-50 transition-colors border-r border-gray-100"
              >
                取消
              </button>
              <button 
                onClick={() => {
                   setInputText(recalledContentToShow);
                   setRecalledContentToShow(null);
                }}
                className="flex-1 py-3 text-[16px] font-medium text-[#07C160] active:bg-gray-50 transition-colors"
              >
                重新编辑
              </button>
            </div>
          </motion.div>
        </>
      )}

      {transferActionMsg && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setTransferActionMsg(null)}
            className="fixed inset-0 bg-black/40 z-[100]"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
            className="fixed top-1/2 left-1/2 w-[80%] bg-white rounded-[16px] z-[110] flex flex-col items-center overflow-hidden shadow-xl p-6"
          >
            <div className="w-[60px] h-[60px] bg-[#f9a23c] rounded-full flex items-center justify-center -mt-2 mb-4">
               <span className="text-white text-[28px] font-bold">+</span>
            </div>
            
            <div className="text-[32px] font-bold text-[#f9a23c] mb-2 font-mono">
              ¥{transferActionMsg.amount}
            </div>
            
            <div className="text-[15px] text-[#f9a23c] mb-1">
              转账给 你
            </div>
            
            <div className="text-[13px] text-[#fbc589] mb-8">
              来自 {displayFriendName}
            </div>
            
            <div className="flex w-full gap-4">
              <button 
                onClick={() => {
                   const { id, amount, title } = transferActionMsg;
                   const newText = `[TRANSFER:${amount}:${title}:REJECTED]`;
                   // Update message
                   AppDB.messages.update(id, { text: newText }).then(() => {
                       if (onEditMessage) {
                           onEditMessage(id, newText);
                       }
                   });
                   onSendMessage('您拒绝了对方的转账', 'narrator');
                   onSendMessage('[ACTION:REJECT_TRANSACTION]', 'system');
                   setTransferActionMsg(null);
                }}
                className="flex-[1] py-3 text-[16px] font-medium text-[#f9a23c] bg-white border border-[#f9a23c] rounded-[10px] active:bg-gray-50 transition-colors"
              >
                拒收
              </button>
              <button 
                onClick={() => {
                   const { id, amount, title } = transferActionMsg;
                   const newText = `[TRANSFER:${amount}:${title}:ACCEPTED]`;
                   // Update msg db
                   AppDB.messages.update(id, { text: newText }).then(() => {
                       if (onEditMessage) {
                           onEditMessage(id, newText);
                       }
                   });
                   
                   // Add wallet balance
                   const parsedAmount = parseFloat(amount);
                   if (!isNaN(parsedAmount)) {
                      setWalletBalance(walletBalance + parsedAmount);
                   }
                   
                   onSendMessage('您接收了对方的转账', 'narrator');
                   onSendMessage('[ACTION:ACCEPT_TRANSACTION]', 'system');
                   setTransferActionMsg(null);
                }}
                className="flex-[1] py-3 text-[16px] font-medium text-white bg-[#f9a23c] rounded-[10px] active:bg-[#e08e2f] transition-colors"
              >
                接收
              </button>
            </div>
          </motion.div>
        </>
      )}

      {viewingImageDesc !== null && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingImageDesc(null)} className="fixed inset-0 bg-black/40 z-[100]" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }} animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }} exit={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }} className="fixed top-1/2 left-1/2 w-[75%] bg-white rounded-[12px] z-[110] flex flex-col overflow-hidden">
            <div className="py-4 text-center text-[17px] font-medium text-gray-900 border-b border-gray-200">图片描述</div>
            <div className="px-5 py-4 text-center text-[16px] text-gray-700 min-h-[60px] flex items-center justify-center">{viewingImageDesc}</div>
            <div className="border-t border-gray-200">
              <button onClick={() => setViewingImageDesc(null)} className="w-full py-3 text-[16px] font-medium text-[#576B95] active:bg-gray-50 transition-colors">确定</button>
            </div>
          </motion.div>
        </>
      )}

      {showVoiceModal && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowVoiceModal(false)} className="fixed inset-0 bg-black/40 z-[100]" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }} animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }} exit={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }} className="fixed top-1/2 left-1/2 w-[84%] bg-white rounded-[20px] z-[110] flex flex-col overflow-hidden shadow-xl">
            <div className="p-5 pb-4">
              <div className="text-[17px] font-medium text-gray-900 mb-1">语音消息</div>
              <div className="text-[13px] text-gray-400 mb-4">用文字模拟语音内容</div>
              <textarea
                value={voiceInput}
                onChange={e => setVoiceInput(e.target.value)}
                placeholder="输入你想说的话..."
                autoFocus
                className="w-full h-[100px] px-3 py-3 border border-gray-200 rounded-[10px] text-[15px] text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition-colors resize-none bg-[#fafafa]"
              />
            </div>
            <div className="flex border-t border-gray-100">
              <button onClick={() => setShowVoiceModal(false)} className="flex-1 py-3.5 text-[16px] font-medium text-gray-900 active:bg-gray-50 transition-colors border-r border-gray-100">取消</button>
              <button onClick={() => {
                if (voiceInput.trim()) {
                  onSendMessage(`[voice:${voiceInput.trim()}]`, 'voice');
                  setShowVoiceModal(false);
                }
              }} className="flex-1 py-3.5 text-[16px] font-medium text-[#576B95] active:bg-gray-50 transition-colors">发送</button>
            </div>
          </motion.div>
        </>
      )}

      {showImageDescModal && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowImageDescModal(false)} className="fixed inset-0 bg-black/40 z-[100]" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }} animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }} exit={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }} className="fixed top-1/2 left-1/2 w-[80%] bg-white rounded-[12px] z-[110] flex flex-col overflow-hidden">
            <div className="p-5 pb-4">
              <div className="text-[17px] font-medium text-gray-900 mb-4">发送图片</div>
              <input type="text" value={imageDesc} onChange={e => setImageDesc(e.target.value)} placeholder="请输入图片描述" className="w-full h-10 px-0 border-b border-[#07C160] text-[16px] focus:outline-none focus:border-[#07C160] transition-colors" autoFocus />
            </div>
            <div className="flex border-t border-gray-100">
              <button onClick={() => setShowImageDescModal(false)} className="flex-1 py-3 text-[16px] font-medium text-gray-900 active:bg-gray-50 transition-colors border-r border-gray-100">取消</button>
              <button onClick={() => { if (imageDesc.trim()) { onSendMessage(`[image:${imageDesc.trim()}]`); } setShowImageDescModal(false); }} className="flex-1 py-3 text-[16px] font-medium text-[#576B95] active:bg-gray-50 transition-colors">确定</button>
            </div>
          </motion.div>
        </>
      )}

      {showRedPacketModal && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRedPacketModal(false)}
            className="fixed inset-0 bg-black/40 z-[100]"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
            className="fixed top-1/2 left-1/2 w-[80%] bg-[#f35543] rounded-[12px] z-[110] flex flex-col overflow-hidden shadow-xl"
          >
            <div className="p-5 pb-4">
              <div className="text-[17px] font-medium text-white mb-4">发红包</div>
              <input 
                type="number" 
                value={moneyAmount}
                onChange={e => setMoneyAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-12 px-3 bg-white/20 rounded-[8px] text-[24px] text-white placeholder:text-white/50 focus:outline-none focus:bg-white/30 transition-colors mb-4 text-center font-medium"
                autoFocus
              />
              <input 
                type="text" 
                value={moneyTitle}
                onChange={e => setMoneyTitle(e.target.value)}
                placeholder="大吉大利，万事如意"
                className="w-full h-10 px-3 bg-white/20 rounded-[8px] text-[15px] text-white placeholder:text-white/50 focus:outline-none focus:bg-white/30 transition-colors text-center"
              />
            </div>
            
            <div className="flex border-t border-white/20 mt-2">
              <button 
                onClick={() => setShowRedPacketModal(false)}
                className="flex-1 py-3 text-[16px] font-medium text-white/80 active:bg-white/10 transition-colors border-r border-white/20"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  const amountNum = parseFloat(moneyAmount);
                  if (!amountNum || amountNum <= 0) {
                    alert('请输入有效金额');
                    return;
                  }
                  const bankBalance = bankCards.reduce((sum, card) => sum + card.balance, 0);
                  const totalBalance = walletBalance + bankBalance;
                  
                  if (totalBalance < amountNum) {
                    const shortage = (amountNum - totalBalance).toFixed(2);
                    alert(
                      `余额不足\n` +
                      `当前总余额: ¥${totalBalance.toFixed(2)}\n` +
                      `需要金额: ¥${amountNum.toFixed(2)}\n` +
                      `还差: ¥${shortage}`
                    );
                    return;
                  }
                  
                  if (walletBalance >= amountNum) {
                    setWalletBalance(walletBalance - amountNum);
                  } else {
                    let remaining = amountNum - walletBalance;
                    setWalletBalance(0);
                    const newBankCards = [...bankCards];
                    for (let i = 0; i < newBankCards.length && remaining > 0; i++) {
                      if (newBankCards[i].balance > 0) {
                        const deduct = Math.min(newBankCards[i].balance, remaining);
                        newBankCards[i].balance -= deduct;
                        remaining -= deduct;
                      }
                    }
                    setBankCards(newBankCards);
                  }

                  onSendMessage(`[红包] ${moneyTitle || '大吉大利，万事如意'}`);
                  setShowRedPacketModal(false);
                }}
                className="flex-1 py-3 text-[16px] font-medium text-white active:bg-white/10 transition-colors font-bold"
              >
                塞钱进红包
              </button>
            </div>
          </motion.div>
        </>
      )}

      {showPhoneCall && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[200] flex flex-col items-center justify-between py-8 px-6"
          >
            {/* 右上角设置图标 */}
            <div className="w-full flex justify-end">
              <button className="text-white/60 active:text-white transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>
            </div>

            {/* 中间：头像 + 名字 + 状态 */}
            <div className="flex flex-col items-center gap-2">
              <div className={`w-[48px] h-[48px] rounded-full overflow-hidden border-[2px] shadow-[0_0_20px_rgba(255,255,255,0.08)] transition-all duration-500 ${callStatus === 'connected' ? 'border-white/40 scale-110' : callStatus === 'rejected' ? 'border-red-500/50' : 'border-white/20'}`}>
                {friend.avatar
                  ? <img src={friend.avatar} alt="avatar" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gray-600 flex items-center justify-center"><User size={20} className="text-gray-300" /></div>
                }
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-white text-[18px] font-medium tracking-wide">{friend.wechat_remark || friend.name}</span>
                {callStatus === 'calling' && (
                  <span className="text-white/70 text-[13px]">正在呼叫...</span>
                )}
                {callStatus === 'connected' && (
                  <span className="text-[#4ade80] text-[13px]">通话中</span>
                )}
                {callStatus === 'rejected' && (
                  <span className="text-red-400 text-[13px]">对方未接听</span>
                )}
                <span className="text-white/50 text-[10px] font-mono tabular-nums">
                  {callStatus === 'calling'
                    ? '00:00'
                    : `${String(Math.floor(callSeconds / 60)).padStart(2, '0')}:${String(callSeconds % 60).padStart(2, '0')}`
                  }
                </span>
              </div>
            </div>

            {/* 通话消息滚动区 */}
            {callStatus === 'connected' && (() => {
              // 找到 [PHONE_CALL_START] 之后的所有消息
              const callStartIdx = (() => {
                for (let i = messages.length - 1; i >= 0; i--) {
                  if (messages[i].text === '[PHONE_CALL_START]') return i;
                }
                return -1;
              })();
              const callMsgs = callStartIdx >= 0 ? messages.slice(callStartIdx + 1).filter(m => m.text !== '[PHONE_CALL_HEART]' && m.msgType !== 'system') : [];
              if (callMsgs.length === 0) return null;
              return (
                <div className="w-full flex-1 overflow-y-auto px-4 flex flex-col gap-3 no-scrollbar max-h-[55vh]">
                  {callMsgs.map((msg: any, idx: number) => {
                    const text = msg.text || '';
                    if (msg.msgType === 'narrator' && !msg.isMe) {
                      return (
                        <div
                          key={idx}
                          className="w-full flex justify-center"
                          onPointerDown={() => {
                            callMsgLongPressTimer.current = setTimeout(() => {
                              if (navigator.vibrate) navigator.vibrate(50);
                              setCallMsgActionMenu({ msg });
                            }, 500);
                          }}
                          onPointerUp={() => { if (callMsgLongPressTimer.current) { clearTimeout(callMsgLongPressTimer.current); callMsgLongPressTimer.current = null; } }}
                          onPointerLeave={() => { if (callMsgLongPressTimer.current) { clearTimeout(callMsgLongPressTimer.current); callMsgLongPressTimer.current = null; } }}
                          onPointerCancel={() => { if (callMsgLongPressTimer.current) { clearTimeout(callMsgLongPressTimer.current); callMsgLongPressTimer.current = null; } }}
                          onContextMenu={(e) => { e.preventDefault(); if (callMsgLongPressTimer.current) { clearTimeout(callMsgLongPressTimer.current); callMsgLongPressTimer.current = null; } }}
                        >
                          <span className="text-[13px] text-white/50 italic leading-relaxed text-center whitespace-pre-wrap">{text}</span>
                        </div>
                      );
                    }
                    // 解析旁白（普通文本）和说话内容（「」包裹）
                    const segments: { type: 'narrator' | 'dialogue'; text: string }[] = [];
                    const hasQuote = text.includes('「') && text.includes('」');
                    if (hasQuote) {
                      let cur = 0;
                      while (cur < text.length) {
                        const open = text.indexOf('「', cur);
                        if (open === -1) {
                          const t = text.substring(cur).trim();
                          if (t) segments.push({ type: 'narrator', text: t });
                          break;
                        }
                        if (open > cur) {
                          const t = text.substring(cur, open).trim();
                          if (t) segments.push({ type: 'narrator', text: t });
                        }
                        const close = text.indexOf('」', open + 1);
                        if (close === -1) {
                          const t = text.substring(open).trim();
                          if (t) segments.push({ type: 'narrator', text: t });
                          break;
                        }
                        const inner = text.substring(open + 1, close).trim();
                        if (inner) segments.push({ type: 'dialogue', text: inner });
                        cur = close + 1;
                      }
                    } else {
                      if (text.trim()) {
                        // 用户自己发的消息没有「」时，自动用「」包裹后视为对话内容（带下划线）而非旁白
                        segments.push({ type: msg.isMe ? 'dialogue' : 'narrator', text: msg.isMe ? `「${text.trim()}」` : text.trim() });
                      }
                    }
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col gap-1 ${msg.isMe ? 'items-end' : 'items-start'}`}
                        onPointerDown={() => {
                          callMsgLongPressTimer.current = setTimeout(() => {
                            if (navigator.vibrate) navigator.vibrate(50);
                            setCallMsgActionMenu({ msg });
                          }, 500);
                        }}
                        onPointerUp={() => { if (callMsgLongPressTimer.current) { clearTimeout(callMsgLongPressTimer.current); callMsgLongPressTimer.current = null; } }}
                        onPointerLeave={() => { if (callMsgLongPressTimer.current) { clearTimeout(callMsgLongPressTimer.current); callMsgLongPressTimer.current = null; } }}
                        onPointerCancel={() => { if (callMsgLongPressTimer.current) { clearTimeout(callMsgLongPressTimer.current); callMsgLongPressTimer.current = null; } }}
                        onContextMenu={(e) => { e.preventDefault(); if (callMsgLongPressTimer.current) { clearTimeout(callMsgLongPressTimer.current); callMsgLongPressTimer.current = null; } }}
                      >
                        {segments.map((seg, sIdx) => {
                          if (seg.type === 'narrator') {
                            return (
                              <span key={sIdx} className="text-[13px] text-white/50 italic leading-relaxed text-center w-full whitespace-pre-wrap">
                                {seg.text}
                              </span>
                            );
                          }
                          return (
                            <span key={sIdx} className="text-[15px] text-white leading-relaxed whitespace-pre-wrap underline underline-offset-[3px] decoration-white/60">
                              {seg.text}
                            </span>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* 底部：输入栏 + 挂断按钮 */}
            <div className="flex flex-col items-center gap-4 w-full">
              {/* 通话中输入栏 */}
              {callStatus === 'connected' && (
                <div className="w-full flex items-center gap-2 px-2">
                  <div className="flex-1 flex items-center bg-white/10 rounded-full px-4 py-2.5 border border-white/20">
                    <input
                      ref={callInputRef}
                      type="text"
                      value={callInputText}
                      onChange={e => setCallInputText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && callInputText.trim()) {
                          onSendMessage(`「${callInputText.trim()}」`, 'text');
                          setCallInputText('');
                        }
                      }}
                      placeholder="请输入消息..."
                      className="flex-1 bg-transparent text-white placeholder-white/40 text-[14px] outline-none"
                    />
                  </div>
                  {/* 爱心按钮：触发AI回复（通话场景） */}
                  <button
                    onClick={() => {
                      // 先发一条通话心跳标记，让 handleTriggerAI 识别为通话场景
                      onSendMessage('[PHONE_CALL_HEART]', 'system');
                      setTimeout(() => {
                        if (onTriggerAI) onTriggerAI();
                      }, 50);
                    }}
                    className="w-10 h-10 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Heart size={24} className="text-white/80" strokeWidth={1.5} />
                  </button>
                  {/* 发送按钮 */}
                  <button
                    onClick={() => {
                      if (callInputText.trim()) {
                        onSendMessage(`「${callInputText.trim()}」`, 'text');
                        setCallInputText('');
                      }
                    }}
                    className="w-10 h-10 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Send size={22} className="text-white/80" strokeWidth={1.5} />
                  </button>
                </div>
              )}

              {/* 挂断按钮 */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => {
                    // 清理所有定时器
                    if (callRejectTimerRef.current) {
                      clearTimeout(callRejectTimerRef.current);
                      callRejectTimerRef.current = null;
                    }
                    if (callTimerRef.current) {
                      clearInterval(callTimerRef.current);
                      callTimerRef.current = null;
                    }
                    // 只有通话中才发送通话时长
                    if (callStatus === 'connected') {
                      const mins = Math.floor(callSeconds / 60);
                      const secs = callSeconds % 60;
                      const mmss = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                      onSendMessage(`[PHONE_CALL_END:${mmss}]`, 'system');
                      onSendMessage(`（通话已挂断，本次通话时长 ${mmss}。）`, 'narrator');
                    } else if (callStatus === 'calling') {
                      onSendMessage('「已取消通话」', 'system');
                    }
                    setShowPhoneCall(false);
                    setCallSeconds(0);
                    setCallStatus('calling');
                    setCallInputText('');
                  }}
                  className="w-[52px] h-[52px] bg-[#f03e3e] rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(240,62,62,0.4)] active:scale-95 transition-transform"
                >
                  <Phone size={22} className="text-white rotate-[135deg]" strokeWidth={2} />
                </button>
                <span className="text-white/40 text-[12px]">挂断</span>
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* 通话回顾全屏界面 */}
      {callReviewEndIdx !== null && (() => {
        // 找到该 PHONE_CALL_END 消息之前最近的 PHONE_CALL_START
        const endMsg = messages[callReviewEndIdx];
        const mmss = endMsg?.text?.match(/^\[PHONE_CALL_END:([\d:]+)\]$/)?.[1] || '';
        let startIdx = -1;
        for (let i = callReviewEndIdx - 1; i >= 0; i--) {
          if (messages[i].text === '[PHONE_CALL_START]') { startIdx = i; break; }
        }
        const reviewMsgs = startIdx >= 0
          ? messages.slice(startIdx + 1, callReviewEndIdx).filter(m => m.text !== '[PHONE_CALL_HEART]' && m.msgType !== 'system')
          : [];
        return (
          <motion.div
            key="callReview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[250] flex flex-col"
          >
            {/* 头部 */}
            <div className="flex flex-col items-center pt-14 pb-6 shrink-0">
              <div className="w-[48px] h-[48px] rounded-full overflow-hidden border-[2px] border-white/30 mb-3">
                {friend.avatar
                  ? <img src={friend.avatar} alt="avatar" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gray-600 flex items-center justify-center"><User size={20} className="text-gray-300" /></div>
                }
              </div>
              <span className="text-white text-[18px] font-medium">{friend.wechat_remark || friend.name}</span>
              <span className="text-white/40 text-[13px] mt-1">通话时长 {mmss}</span>
            </div>
            {/* 关闭按钮 */}
            <button
              onClick={() => setCallReviewEndIdx(null)}
              className="absolute top-12 right-5 text-white/60 active:text-white transition-colors"
            >
              <X size={22} strokeWidth={1.5} />
            </button>
            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto px-5 pb-8 flex flex-col gap-3 no-scrollbar">
              {reviewMsgs.map((msg: any, idx: number) => {
                const text = msg.text || '';
                const reviewLongPressStart = () => {
                  callMsgLongPressTimer.current = setTimeout(() => {
                    if (navigator.vibrate) navigator.vibrate(50);
                    setCallMsgActionMenu({ msg });
                  }, 500);
                };
                const reviewLongPressCancel = () => {
                  if (callMsgLongPressTimer.current) { clearTimeout(callMsgLongPressTimer.current); callMsgLongPressTimer.current = null; }
                };
                if (msg.msgType === 'narrator') {
                  return (
                    <div
                      key={idx}
                      className="w-full flex justify-center my-2"
                      onPointerDown={reviewLongPressStart}
                      onPointerUp={reviewLongPressCancel}
                      onPointerLeave={reviewLongPressCancel}
                      onPointerCancel={reviewLongPressCancel}
                      onContextMenu={(e) => { e.preventDefault(); reviewLongPressCancel(); }}
                    >
                      <span className="text-[13px] text-white/50 italic leading-relaxed text-center whitespace-pre-wrap">{text}</span>
                    </div>
                  );
                }
                const segments: { type: 'narrator' | 'dialogue'; text: string }[] = [];
                const hasQuote2 = text.includes('「') && text.includes('」');
                if (hasQuote2) {
                  let cur = 0;
                  while (cur < text.length) {
                    const open = text.indexOf('「', cur);
                    if (open === -1) { const t = text.substring(cur).trim(); if (t) segments.push({ type: 'narrator', text: t }); break; }
                    if (open > cur) { const t = text.substring(cur, open).trim(); if (t) segments.push({ type: 'narrator', text: t }); }
                    const close = text.indexOf('」', open + 1);
                    if (close === -1) { const t = text.substring(open).trim(); if (t) segments.push({ type: 'narrator', text: t }); break; }
                    const inner = text.substring(open + 1, close).trim();
                    if (inner) segments.push({ type: 'dialogue', text: inner });
                    cur = close + 1;
                  }
                } else {
                  if (text.trim()) {
                    // 用户自己发的消息没有「」时，自动用「」包裹后视为对话内容（带下划线）而非旁白
                    segments.push({ type: msg.isMe ? 'dialogue' : 'narrator', text: msg.isMe ? `「${text.trim()}」` : text.trim() });
                  }
                }
                return (
                  <div
                    key={idx}
                    className={`flex flex-col gap-1 ${msg.isMe ? 'items-end' : 'items-start'}`}
                    onPointerDown={reviewLongPressStart}
                    onPointerUp={reviewLongPressCancel}
                    onPointerLeave={reviewLongPressCancel}
                    onPointerCancel={reviewLongPressCancel}
                    onContextMenu={(e) => { e.preventDefault(); reviewLongPressCancel(); }}
                  >
                    {segments.map((seg, sIdx) => {
                      if (seg.type === 'narrator') {
                        return (
                          <span key={sIdx} className="text-[13px] text-white/50 italic leading-relaxed text-center w-full whitespace-pre-wrap my-1">
                            {seg.text}
                          </span>
                        );
                      }
                      return (
                        <span key={sIdx} className="text-[15px] text-white leading-relaxed whitespace-pre-wrap underline underline-offset-[3px] decoration-white/60">
                          {seg.text}
                        </span>
                      );
                    })}
                  </div>
                );
              })}
              {reviewMsgs.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-white/30 text-[14px]">暂无通话记录</span>
                </div>
              )}
            </div>
          </motion.div>
        );
      })()}

      {/* 通话消息长按操作菜单 */}
      {callMsgActionMenu && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCallMsgActionMenu(null)}
            className="fixed inset-0 bg-black/40 z-[300]"
          />
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
            className="fixed bottom-0 left-0 right-0 z-[310] p-3 pb-10"
          >
            <div className="bg-[#2a2a2a] rounded-[14px] overflow-hidden mb-2">
              <button
                onClick={() => {
                  const msg = callMsgActionMenu.msg;
                  let initialText = msg.text || '';
                  // 去掉「」包裹
                  if (initialText.startsWith('「') && initialText.endsWith('」')) {
                    initialText = initialText.slice(1, -1);
                  }
                  setCallEditingMsg(msg);
                  setCallEditingText(initialText);
                  setCallMsgActionMenu(null);
                }}
                className="w-full flex items-center justify-center gap-2 py-[15px] border-b border-white/10 active:bg-white/10"
              >
                <Edit2 size={18} className="text-white" />
                <span className="text-[16px] text-white">编辑</span>
              </button>
              <button
                onClick={() => {
                  try { navigator.clipboard.writeText(callMsgActionMenu.msg.text || ''); } catch (e) {}
                  setCallMsgActionMenu(null);
                }}
                className="w-full flex items-center justify-center gap-2 py-[15px] border-b border-white/10 active:bg-white/10"
              >
                <Copy size={18} className="text-white" />
                <span className="text-[16px] text-white">复制</span>
              </button>
              <button
                onClick={() => {
                  if (onDeleteMessages) onDeleteMessages([callMsgActionMenu.msg.id]);
                  setCallMsgActionMenu(null);
                }}
                className="w-full flex items-center justify-center gap-2 py-[15px] active:bg-white/10"
              >
                <Trash2 size={18} className="text-[#ff6b6b]" />
                <span className="text-[16px] text-[#ff6b6b]">删除</span>
              </button>
            </div>
            <button
              onClick={() => setCallMsgActionMenu(null)}
              className="w-full py-[15px] bg-[#2a2a2a] rounded-[14px] text-[16px] font-medium text-white/60 active:bg-white/10"
            >
              取消
            </button>
          </motion.div>
        </>
      )}

      {/* 通话消息编辑弹窗 */}
      {callEditingMsg && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[320]"
            onClick={() => setCallEditingMsg(null)}
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 bg-[#1c1c1c] rounded-t-[16px] z-[330] pb-10 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <button className="text-white/50 text-[16px]" onClick={() => setCallEditingMsg(null)}>取消</button>
              <span className="text-white font-medium">编辑消息</span>
              <button
                className={`text-[16px] font-medium ${callEditingText.trim() ? 'text-[#4ade80]' : 'text-white/30'}`}
                onClick={() => {
                  if (callEditingText.trim() && onEditMessage) {
                    const msg = callEditingMsg;
                    let newText = callEditingText.trim();
                    // 如果原来有「」包裹，保留
                    if ((msg.text || '').startsWith('「') && (msg.text || '').endsWith('」')) {
                      newText = `「${newText}」`;
                    }
                    onEditMessage(msg.id, newText);
                    setCallEditingMsg(null);
                    if (navigator.vibrate) navigator.vibrate(50);
                  }
                }}
              >
                确认
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={callEditingText}
                onChange={(e) => setCallEditingText(e.target.value)}
                autoFocus
                className="w-full h-32 bg-white/10 rounded-lg p-3 text-[16px] text-white outline-none resize-none placeholder:text-white/30"
                placeholder="请输入消息内容..."
              />
            </div>
          </motion.div>
        </>
      )}

      {/* 通话气泡长按删除菜单 */}
      {callBubbleLongPressMsg && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCallBubbleLongPressMsg(null)}
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
              <button
                onClick={() => {
                  // 找到从 PHONE_CALL_START 到 PHONE_CALL_END 的所有消息 id
                  const endIdx = callBubbleLongPressMsg.endIdx;
                  let startIdx = -1;
                  for (let i = endIdx - 1; i >= 0; i--) {
                    if (messages[i].text === '[PHONE_CALL_START]') { startIdx = i; break; }
                  }
                  const idsToDelete: number[] = [];
                  const rangeStart = startIdx >= 0 ? startIdx : endIdx;
                  for (let i = rangeStart; i <= endIdx; i++) {
                    if (messages[i]?.id != null) idsToDelete.push(messages[i].id);
                  }
                  if (idsToDelete.length > 0 && onDeleteMessages) onDeleteMessages(idsToDelete);
                  setCallBubbleLongPressMsg(null);
                }}
                className="w-full flex items-center justify-center gap-2 py-[15px] active:bg-gray-200/50 bg-white"
              >
                <Trash2 size={18} className="text-[#ee0a24]" />
                <span className="text-[16px] text-[#ee0a24]">删除通话记录</span>
              </button>
            </div>
            <button
              onClick={() => setCallBubbleLongPressMsg(null)}
              className="w-full py-[15px] bg-white rounded-[14px] text-[16px] font-medium text-[#4B79B5] active:bg-gray-100"
            >
              取消
            </button>
          </motion.div>
        </>
      )}

      {/* 我谕道具弹窗（独立组件） */}
      <WoYuModal
        visible={showWoYuModal}
        onClose={() => {
          setShowWoYuModal(false);
          setWoYuActiveRecord(getActiveRecord(String(friend.id)));
        }}
        onSendProp={(desc) => {
          // 旁白文本（出现了/被收回了/效果消退了）用 narrator 类型渲染成卡片
          const isNarrator = /^\[.*(出现了|被收回了|的效果消退了)/.test(desc);
          onSendMessage(desc, isNarrator ? 'narrator' : 'system');
        }}
        contactId={String(friend.id)}
      />

      {showWorldbookSelect && (
        <motion.div 
          initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }} transition={{ duration: 0.2 }}
          className="fixed inset-0 items-end justify-center z-[210] max-w-[420px] mx-auto flex"
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowWorldbookSelect(false)} />
          <div className="w-full h-[70vh] bg-white rounded-t-[20px] flex flex-col relative pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <span className="text-[17px] font-medium text-gray-800">关联世界书 ({linkedWorldbooks.length})</span>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                     if (onUpdateFriend) {
                        onUpdateFriend({ linked_worldbooks: linkedWorldbooks, linkedWorldbooks });
                     }
                     setShowWorldbookSelect(false);
                  }} 
                  className="text-[15px] font-medium text-[#07C160]"
                >
                  保存
                </button>
                <button onClick={() => setShowWorldbookSelect(false)} className="text-gray-400 active:text-gray-600">
                  <X size={24} strokeWidth={1.5} />
                </button>
              </div>
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
    </>
  );
};

const FriendProfileScreen = ({ friend, onBack, onSendMessage, onClearChat }: { friend: any; onBack: () => void; onSendMessage?: () => void, onClearChat?: () => void }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 bg-[#f7f7f7] z-[70] flex flex-col pt-4"
    >
      {/* Status Bar */}
      <div className="flex justify-between items-center px-7 text-[13px] font-medium text-gray-800 shrink-0 bg-[#ededed] pb-2">
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
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-[#ededed] border-b border-gray-200/50">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-800 active:bg-gray-100 rounded-full transition-colors z-10">
          <ChevronLeft size={24} strokeWidth={2} />
        </button>
        <span className="text-[17px] font-medium text-gray-800 absolute left-1/2 -translate-x-1/2">
          详细资料
        </span>
        <button className="p-2 -mr-2 text-gray-800 active:bg-gray-100 rounded-full transition-colors z-10">
          <MoreHorizontal size={24} strokeWidth={2} className="text-[#576b95]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-8 pt-4 px-4 flex flex-col gap-4">
        {/* Top Card */}
        <div className="bg-white rounded-xl p-5 shadow-sm flex items-start gap-4 border border-gray-100">
          <div className="w-[68px] h-[68px] rounded-[10px] bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200">
            {friend.avatar ? (
              <img src={friend.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={32} className="text-gray-400" />
            )}
          </div>
          <div className="flex flex-col justify-center py-1">
            <span className="text-[20px] font-medium text-gray-800 mb-1">
              {friend.wechat_remark ? `${friend.wechat_remark}（${friend.name}）` : friend.name}
            </span>
            <span className="text-[13px] text-gray-500">微信号：{friend.wechat_id || '未设置'}</span>
            <span className="text-[13px] text-gray-500 mt-0.5">地区：{friend.region || '未设置'}</span>
          </div>
        </div>

        {/* Moments Card */}
        <div className="bg-white rounded-xl px-5 py-4 shadow-sm flex items-center justify-between border border-gray-100 active:bg-gray-50 cursor-pointer">
          <div className="flex items-center gap-3">
            <Disc size={20} className="text-gray-700" />
            <span className="text-[15px] text-gray-800">朋友圈</span>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </div>

        {/* Actions Cards */}
        <div className="flex gap-3 mt-1">
          <button 
            onClick={onSendMessage}
            className="flex-1 bg-white border border-gray-100 rounded-xl py-4 flex items-center justify-center gap-2 active:bg-gray-50 shadow-sm transition-colors text-[#576B95]"
          >
            <MessageSquare size={20} className="text-[#576B95]" />
            <span className="text-[15px] font-medium">发消息</span>
          </button>
          <button className="flex-1 bg-white border border-gray-100 rounded-xl py-4 flex items-center justify-center gap-2 active:bg-gray-50 shadow-sm transition-colors text-[#576B95]">
            <Phone size={20} className="text-[#576B95]" />
            <span className="text-[15px] font-medium">音视频通话</span>
          </button>
        </div>
        
        {/* Delete Chat Card */}
        <div 
          onClick={() => setShowDeleteConfirm(true)}
          className="bg-white border border-gray-100 shadow-sm flex items-center justify-between px-4 min-h-[60px] active:bg-red-50 cursor-pointer rounded-xl mt-1 mb-8"
        >
          <span className="text-[16px] text-[#ee0a24] font-medium leading-none">清空聊天记录与心声</span>
        </div>
      </div>
      
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="fixed inset-0 bg-black/40 z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
              animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
              exit={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
              className="fixed top-1/2 left-1/2 w-[80%] bg-white rounded-[12px] z-[110] flex flex-col overflow-hidden"
            >
              <div className="p-6 pb-5 text-center">
                <div className="text-[17px] font-medium text-gray-900 mb-2">清空聊天记录</div>
                <div className="text-[15px] text-gray-500">确认清空所有聊天记录与心声？此操作不可恢复。</div>
              </div>
              
              <div className="flex border-t border-gray-100">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3.5 text-[16px] font-medium text-gray-900 active:bg-gray-50 transition-colors border-r border-gray-100"
                >
                  取消
                </button>
                <button 
                  onClick={() => {
                    if (onClearChat) onClearChat();
                    setShowDeleteConfirm(false);
                  }}
                  className="flex-1 py-3.5 text-[16px] font-medium text-[#ee0a24] active:bg-red-50 transition-colors"
                >
                  清空
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const WechatScreen = ({ 
  onBack,
  requests,
  friends,
  chats,
  personas,
  myProfile,
  onSendMessage,
  onAcceptRequest,
  onAddFriend,
  onOpenMyProfile,
  onSetRemark,
  onDeleteMessages,
  onEditMessage,
  onClearChat,
  onTriggerAI,
  isTyping,
  onUpdateFriend,
  consoleLogs,
  onClearConsoleLogs,
}: { 
  onBack: () => void;
  requests: any[];
  friends: any[];
  chats: Record<string, any[]>;
  personas: any[];
  myProfile?: any;
  onSendMessage: (friendId: string, text: string, isMe: boolean, msgType?: string, recalledContent?: string) => void;
  onAcceptRequest: (id: string) => void;
  onAddFriend: (persona: any) => void;
  onOpenMyProfile?: () => void;
  onSetRemark?: (friendId: string, remark: string) => void;
  onDeleteMessages?: (friendId: string, messageIds: number[]) => Promise<void> | void;
  onEditMessage?: (friendId: string, msgId: number, newText: string) => void;
  onClearChat?: (friendId: string) => void;
  onTriggerAI?: (friendId: string) => void;
  isTyping?: Record<string, boolean>;
  onUpdateFriend?: (friendId: string, data: any) => void;
  consoleLogs?: string[];
  onClearConsoleLogs?: () => void;
  key?: React.Key;
}) => {
  const [showPayScreen, setShowPayScreen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(() => {
    const saved = localStorage.getItem('wechat_wallet_balance');
    return saved ? parseFloat(saved) : 1000.00;
  });
  const [bankCards, setBankCards] = useState<any[]>(() => {
    const saved = localStorage.getItem('wechat_bank_cards');
    return saved ? JSON.parse(saved) : [];
  });

  React.useEffect(() => {
    localStorage.setItem('wechat_wallet_balance', walletBalance.toString());
  }, [walletBalance]);

  React.useEffect(() => {
    const syncWallet = () => {
      const saved = localStorage.getItem('wechat_wallet_balance');
      if (saved) setWalletBalance(parseFloat(saved));
    };
    window.addEventListener('wallet_balance_updated', syncWallet);
    return () => window.removeEventListener('wallet_balance_updated', syncWallet);
  }, []);

  React.useEffect(() => {
    localStorage.setItem('wechat_bank_cards', JSON.stringify(bankCards));
  }, [bankCards]);

  React.useEffect(() => {
    const handleAddFakeCard = () => {
      setBankCards(prev => [...prev, { balance: 5000.00 }]);
      alert('已添加尾号 8888 模拟银行卡，余额 5000.00 元');
    };
    window.addEventListener('addFakeBankCard', handleAddFakeCard);
    return () => window.removeEventListener('addFakeBankCard', handleAddFakeCard);
  }, []);

  const [activeTab, setActiveTab] = useState<'chats' | 'contacts' | 'moments' | 'me'>('chats');
  const [showNewFriends, setShowNewFriends] = useState(false);

  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<any | null>(null);
  const [activeChatFriend, setActiveChatFriend] = useState<any | null>(null);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [searchWechatId, setSearchWechatId] = useState('');
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyMessage, setApplyMessage] = useState('我是...');

  // Default my avatar to myProfile.avatar, or the first persona's bound avatar
  const myAvatar = myProfile?.avatar || personas.find(p => p.my_bound_avatar)?.my_bound_avatar;

  React.useEffect(() => {
    // Navigate to contacts tab explicitly if there are requests when screen loads
    if (requests.length > 0 && activeTab === 'chats') {
      setActiveTab('contacts');
    }
  }, [requests.length]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 15 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 bg-[#fefefe] z-[60] flex flex-col pt-4"
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
      <div className="flex items-center justify-between px-4 py-3 shrink-0 mt-2 border-b border-gray-100 bg-[#fefefe] relative z-20">
        <button onClick={() => showNewFriends ? setShowNewFriends(false) : onBack()} className="p-2 -ml-2 text-gray-800 active:bg-gray-100 rounded-full transition-colors z-10">
          <ChevronLeft size={24} strokeWidth={2} />
        </button>
        <span className="text-[17px] font-medium text-gray-800 absolute left-1/2 -translate-x-1/2">
          {showNewFriends ? '新的朋友' : activeTab === 'chats' ? '微信' : activeTab === 'contacts' ? '通讯录' : activeTab === 'moments' ? '朋友圈' : '我'}
        </span>
        <div className="flex z-10 relative">
          {!showNewFriends && activeTab === 'moments' && (
             <button className="p-2 text-gray-800 active:bg-gray-100 rounded-full transition-colors mr-1">
               <RefreshCcw size={20} strokeWidth={2} />
             </button>
          )}
          {!showNewFriends && (
            <div className="relative">
              <button onClick={() => setShowPlusMenu(!showPlusMenu)} className="p-2 -mr-2 text-gray-800 active:bg-gray-100 rounded-[10px] transition-colors relative z-20">
                <Plus size={24} strokeWidth={2} />
              </button>
              
              <AnimatePresence>
                {showPlusMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPlusMenu(false)}></div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute right-0 top-[44px] w-[140px] bg-[#fdfdfd] rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-gray-100/50 py-1.5 z-50 origin-top-right backdrop-blur-md"
                    >
                      {/* Triangle pointer */}
                      <div className="absolute -top-[5px] right-[16px] w-[10px] h-[10px] bg-[#fdfdfd] border-t border-l border-gray-100/50 rotate-45"></div>
                      
                      <button className="w-full relative z-10 px-4 py-3 flex items-center gap-3 text-gray-800 active:bg-gray-100 transition-colors border-b border-gray-50/50">
                        <Layout size={20} strokeWidth={1.5} className="text-gray-800" />
                        <span className="text-[15px] font-medium">发起群聊</span>
                      </button>
                      <button onClick={() => { setShowPlusMenu(false); setShowAddFriendModal(true); setSearchWechatId(''); setShowApplyModal(false); }} className="w-full relative z-10 px-4 py-3 flex items-center gap-3 text-gray-800 active:bg-gray-100 transition-colors">
                        <UserPlus size={20} strokeWidth={1.5} className="text-gray-800" />
                        <span className="text-[15px] font-medium">添加朋友</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar w-full flex flex-col p-3 pb-8 bg-[#f3f3f3]">
        {activeTab === 'chats' && (
          <div className="flex flex-col gap-2.5">
            {Object.keys(chats).length === 0 ? (
              <div className="py-20 flex items-center justify-center text-gray-400 text-[14px]">
                暂无聊天消息
              </div>
            ) : (
              Object.keys(chats).map(friendId => {
                const friend = friends.find(f => f.id === friendId);
                if (!friend) return null;
                const msgs = chats[friendId];
                // 找最后一条非 system 且文本有意义的消息作为预览
                const previewMsg = [...msgs].reverse().find(m => {
                  if (m.msgType === 'system') return false;
                  const t = (m.text || '').replace(/\[LOCATION:.*?\]/g, '').trim();
                  return t.length > 0;
                }) || msgs[msgs.length - 1];
                const lastMsg = msgs[msgs.length - 1];
                const previewText = previewMsg
                  ? (previewMsg.text || '').replace(/\[LOCATION:.*?\]/g, '').trim()
                  : '';
                return (
                  <div 
                    key={friendId}
                    onClick={() => setActiveChatFriend(friend)}
                    className="bg-white border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center gap-3 p-3 active:bg-gray-50 cursor-pointer rounded-[16px]"
                  >
                    <div className="w-[52px] h-[52px] bg-gray-100 rounded-[12px] flex items-center justify-center overflow-hidden shrink-0">
                      {friend.avatar ? (
                        <img src={friend.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User size={24} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex flex-col justify-center flex-1 overflow-hidden pr-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[17px] font-medium text-[#333333] text-ellipsis whitespace-nowrap overflow-hidden pr-2">{friend.wechat_remark || friend.name}</span>
                        <span className="text-[12px] text-gray-400 shrink-0 font-light">
                          {lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <span className="text-[13px] text-[#999999] text-ellipsis whitespace-nowrap overflow-hidden font-light">
                        {previewText}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
        
        {activeTab === 'contacts' && !showNewFriends && (
          <div className="p-3 flex flex-col gap-2.5 pb-8 bg-[#f3f3f3] min-h-full">
            <div onClick={() => setShowNewFriends(true)} className="bg-white rounded-[16px] border border-gray-100 p-3.5 flex items-center gap-4 relative active:bg-gray-50 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors">
              <div className="w-[46px] h-[46px] bg-[#FA9D3B] rounded-[12px] flex items-center justify-center">
                <UserPlus size={22} className="text-white" />
              </div>
              <span className="text-[17px] text-[#333333]">新的朋友</span>
              {requests.length > 0 && (
                <div className="absolute right-5 w-2 h-2 bg-red-500 rounded-full"></div>
              )}
            </div>
            <div className="bg-white rounded-[16px] border border-gray-100 p-3.5 flex items-center gap-4 active:bg-gray-50 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="w-[46px] h-[46px] bg-[#07C160] rounded-[12px] flex items-center justify-center">
                <Users size={22} className="text-white" />
              </div>
              <span className="text-[17px] text-[#333333]">群聊</span>
            </div>
            <div className="bg-white rounded-[16px] border border-gray-100 p-3.5 flex items-center gap-4 active:bg-gray-50 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="w-[46px] h-[46px] bg-[#2782D7] rounded-[12px] flex items-center justify-center">
                <Tag size={22} className="text-white" />
              </div>
              <span className="text-[17px] text-[#333333]">标签</span>
            </div>

            {/* Friends List */}
            {friends.length > 0 && (
              <div className="mt-2">
                <div className="text-[13px] text-[#999999] font-medium mb-1.5 px-2">我的好友</div>
                <div className="flex flex-col gap-2.5">
                  {friends.map(friend => (
                    <div key={friend.id} onClick={() => setSelectedFriend(friend)} className="bg-white rounded-[16px] border border-gray-100 p-3 flex items-center gap-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] active:bg-gray-50 cursor-pointer">
                      <div className="w-[48px] h-[48px] bg-gray-100 rounded-[12px] flex items-center justify-center text-gray-400 overflow-hidden">
                        {friend.avatar ? <img src={friend.avatar} alt="" className="w-full h-full object-cover" /> : <User size={24} />}
                      </div>
                      <span className="text-[17px] text-[#333333] font-medium">{friend.wechat_remark || friend.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'contacts' && showNewFriends && (
          <div className="flex-1 bg-[#fcfcfc] min-h-full">
            <div className="flex items-center px-4 py-2 bg-gray-100 border-b border-gray-200">
               <div className="flex bg-white rounded-md flex-1 items-center px-3 py-1.5 text-gray-400 text-sm justify-center">
                  <Search size={16} className="mr-1" /> 微信号/手机号
               </div>
            </div>
            
            <div className="px-4 py-1.5 text-[13px] text-gray-500 bg-gray-50">好友通知</div>

            {requests.map(req => (
              <div key={req.id} className="flex items-center justify-between p-3.5 border border-gray-100 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] mx-3 mt-3 rounded-[16px]">
                <div className="flex gap-4">
                  <div className="w-[48px] h-[48px] bg-gray-100 rounded-[12px] flex items-center justify-center overflow-hidden">
                    {req.avatar ? <img src={req.avatar} alt="" className="w-full h-full object-cover" /> : <User className="text-gray-400" />}
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-[17px] font-medium text-[#333333]">{req.name}</span>
                    <span className="text-[13px] text-[#999999] mt-0.5">请求添加你为朋友</span>
                  </div>
                </div>
                <button onClick={() => onAcceptRequest(req.id)} className="bg-[#07C160] active:bg-[#06ae56] text-white text-[14px] font-medium px-4 py-1.5 rounded-[8px] hover:bg-[#06ae56] transition-colors">
                  接受
                </button>
              </div>
            ))}
            {requests.length === 0 && (
              <div className="text-center pt-20 text-gray-400 text-sm">暂无新朋友请求</div>
            )}
          </div>
        )}

        {activeTab === 'moments' && (
          <div className="bg-[#fcfcfc] min-h-full">
            <div className="relative h-64 border-b border-dashed border-gray-300 mx-4 mt-4 rounded-xl flex items-center justify-center bg-gray-50/50">
              <Camera size={48} className="text-gray-200" strokeWidth={1} />
              
              <div className="absolute -bottom-6 right-2 flex items-end gap-3 z-10">
                <span className="text-[15px] text-gray-800 font-medium mb-2 drop-shadow-sm bg-white/50 px-1 rounded">{myProfile?.name || '未设置昵称'}</span>
                <div className="w-16 h-16 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-center overflow-hidden">
                  {myProfile?.avatar ? <img src={myProfile.avatar} alt="My Avatar" className="w-full h-full object-cover" /> : myAvatar ? <img src={myAvatar} alt="My Avatar" className="w-full h-full object-cover" /> : <User size={32} className="text-gray-300" strokeWidth={1.5} />}
                </div>
              </div>
            </div>
            
            <div className="text-right px-6 mt-8 flex justify-end items-center gap-1">
              <Snowflake size={14} className="text-gray-300" />
              <span className="text-[12px] text-gray-400">{myProfile?.signature || '这里是个性签名'}</span>
            </div>
            
            <div className="flex flex-col items-center justify-center mt-20 opacity-50">
              <div className="w-12 h-12 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                <Edit2 size={20} className="text-gray-400" />
              </div>
              <span className="text-[13px] text-gray-500">暂无朋友圈动态</span>
            </div>
          </div>
        )}

        {activeTab === 'me' && (
          <div className="p-3 flex flex-col gap-3 pb-8 bg-[#f3f3f3] min-h-full">
            {/* Profile Card */}
            <div onClick={() => onOpenMyProfile?.()} className="bg-white rounded-[16px] border border-gray-100 p-5 flex items-center justify-between active:bg-gray-50 cursor-pointer transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-[12px] flex items-center justify-center border border-gray-100 overflow-hidden">
                  {myProfile?.avatar ? <img src={myProfile.avatar} alt="My Avatar" className="w-full h-full object-cover" /> : myAvatar ? <img src={myAvatar} alt="My Avatar" className="w-full h-full object-cover" /> : <User size={32} className="text-gray-300" />}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[18px] font-medium text-[#333333]">{myProfile?.name || '未设置昵称'}</span>
                  <span className="text-[13px] text-gray-500">微信号: {myProfile?.wechat_id || '未设置'}</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </div>

            {/* Options List */}
            <div className="bg-white rounded-[16px] border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
              <div 
                onClick={() => setShowPayScreen(true)}
                className="px-4 py-4 flex items-center justify-between border-b border-gray-100 active:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <CreditCard size={20} className="text-[#333333]" />
                  <span className="text-[16px] text-[#333333]">支付</span>
                </div>
                <ChevronRight size={16} className="text-[#cccccc]" />
              </div>
              <div className="px-4 py-4 flex items-center justify-between active:bg-gray-50 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-[1.5px] border-[#333333] rounded flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full border-[1.5px] border-[#333333]"></div>
                  </div>
                  <span className="text-[16px] text-[#333333]">朋友圈</span>
                </div>
                <ChevronRight size={16} className="text-[#cccccc]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div className="bg-[#fbfbfb] border-t border-gray-100 pb-8 pt-3 px-8 flex justify-between shrink-0 relative z-20">
        <div 
          onClick={() => setActiveTab('chats')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'chats' ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 16a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"/>
            <path d="M14 20a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"/>
          </svg>
          <span className={`text-[10px] ${activeTab === 'chats' ? 'font-medium' : ''}`}>微信</span>
        </div>
        
        <div 
          onClick={() => setActiveTab('contacts')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors relative ${activeTab === 'contacts' ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
        >
          {requests.length > 0 && <div className="absolute top-0 right-1 w-2 h-2 bg-red-500 rounded-full border border-[0.5px] border-white"></div>}
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="6" y="4" width="12" height="16" rx="1.5" />
            <line x1="6" y1="12" x2="18" y2="12" />
          </svg>
          <span className={`text-[10px] ${activeTab === 'contacts' ? 'font-medium' : ''}`}>通讯录</span>
        </div>
        
        <div 
          onClick={() => setActiveTab('moments')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'moments' ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="4" y="4" width="16" height="16" rx="2.5" />
            <circle cx="12" cy="12" r="3.5" />
          </svg>
          <span className={`text-[10px] ${activeTab === 'moments' ? 'font-medium' : ''}`}>朋友圈</span>
        </div>
        
        <div 
          onClick={() => setActiveTab('me')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'me' ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="7" r="4.5" />
            <path d="M5.5 21.5c0-4.5 2.5-7 6.5-7s6.5 2.5 6.5 7" strokeLinecap="round" />
          </svg>
          <span className={`text-[10px] ${activeTab === 'me' ? 'font-medium' : ''}`}>我</span>
        </div>
      </div>
      <AnimatePresence>
        {selectedFriend && (
          <FriendProfileScreen 
            friend={selectedFriend} 
            onBack={() => setSelectedFriend(null)} 
            onSendMessage={() => {
              setActiveChatFriend(selectedFriend);
              setSelectedFriend(null);
            }} 
            onClearChat={() => {
               if (onClearChat) onClearChat(selectedFriend.id);
               setSelectedFriend(null);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {activeChatFriend && (
          <ChatScreen 
            friend={activeChatFriend}
            myAvatar={myAvatar}
            messages={chats[activeChatFriend.id] || []}
            onSendMessage={(msg, msgType, recalledContent) => onSendMessage(activeChatFriend.id, msg, true, msgType, recalledContent)}
            onBack={() => setActiveChatFriend(null)}
            onSetRemark={(remark) => {
              if (onSetRemark) onSetRemark(activeChatFriend.id, remark);
              setActiveChatFriend({ ...activeChatFriend, wechat_remark: remark });
            }}
            onDeleteMessages={(messageIds) => {
              if (onDeleteMessages) onDeleteMessages(activeChatFriend.id, messageIds);
            }}
            onEditMessage={(msgId, newText) => {
              if (onEditMessage) onEditMessage(activeChatFriend.id, msgId, newText);
            }}
            walletBalance={walletBalance}
            setWalletBalance={setWalletBalance}
            bankCards={bankCards}
            setBankCards={setBankCards}
            onClearChat={() => {
              if (onClearChat) onClearChat(activeChatFriend.id);
              setActiveChatFriend(null);
            }}
            onTriggerAI={() => {
              if (onTriggerAI) onTriggerAI(activeChatFriend.id);
            }}
            isTyping={isTyping?.[activeChatFriend.id]}
            onUpdateFriend={(data) => {
              if (onUpdateFriend) onUpdateFriend(activeChatFriend.id, data);
              setActiveChatFriend(prev => prev ? { ...prev, ...data } : prev);
            }}
            consoleLogs={consoleLogs}
            onClearConsoleLogs={onClearConsoleLogs}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddFriendModal && !showApplyModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddFriendModal(false)}
              className="fixed inset-0 bg-black/40 z-[90]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
              animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
              exit={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
              className="fixed top-1/2 left-1/2 w-[85%] bg-white rounded-[16px] z-[100] flex flex-col overflow-hidden"
            >
              <div className="p-6 pb-4">
                <input 
                  type="text" 
                  value={searchWechatId}
                  onChange={e => setSearchWechatId(e.target.value)}
                  placeholder="微信号"
                  className="w-full h-11 px-3 border border-gray-200 rounded-[8px] text-[15px] focus:outline-none focus:border-gray-300"
                />
              </div>
              
              {searchWechatId && (
                <div className="px-6 pb-2">
                  {(() => {
                    const found = personas.find(p => p.wechat_id === searchWechatId);
                    if (found) {
                      return (
                        <div 
                          onClick={() => {
                            setSearchResult(found);
                            setShowApplyModal(true);
                          }}
                          className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-[12px] active:bg-gray-100 cursor-pointer"
                        >
                          <div className="w-[50px] h-[50px] rounded-[10px] bg-gradient-to-br from-[#8089e9] to-[#9966cc] overflow-hidden flex items-center justify-center text-white text-[24px] font-medium shrink-0 shadow-sm border border-black/5">
                            {found.avatar ? <img src={found.avatar} alt="Avatar" className="w-full h-full object-cover" /> : '1'}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[16px] font-medium text-gray-900">{found.name}</span>
                            <span className="text-[13px] text-gray-500 mt-0.5">微信号：{found.wechat_id}</span>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="text-center text-[14px] text-gray-400 py-4">该用户不存在</div>
                    );
                  })()}
                </div>
              )}

              <div className="px-6 py-4 border-t border-gray-100/50">
                <button 
                  onClick={() => {}}
                  className="w-full py-2.5 bg-[#8b8b8b] text-white rounded-[24px] text-[15px] font-medium active:bg-[#7b7b7b] transition-colors"
                >
                  搜索
                </button>
              </div>
            </motion.div>
          </>
        )}

        {showApplyModal && searchResult && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowApplyModal(false);
                setShowAddFriendModal(false);
              }}
              className="fixed inset-0 bg-black/40 z-[90]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
              animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
              exit={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
              className="fixed top-1/2 left-1/2 w-[85%] bg-white rounded-[16px] z-[100] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 px-5">
                <span className="text-[17px] font-medium text-gray-900">申请添加好友</span>
                <button 
                  onClick={() => {
                    setShowApplyModal(false);
                    setShowAddFriendModal(false);
                  }}
                  className="p-1 -mr-1 text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="px-5">
                <div className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-[12px] mb-4">
                  <div className="w-[50px] h-[50px] rounded-[10px] bg-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                    {searchResult.avatar ? <img src={searchResult.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <User size={24} className="text-gray-400" />}
                  </div>
                  <span className="text-[16px] font-medium text-gray-900">{searchResult.name}</span>
                </div>

                <div className="mb-2">
                  <label className="block text-[14px] text-gray-600 mb-2">发送添加朋友申请</label>
                  <textarea 
                    value={applyMessage}
                    onChange={(e) => setApplyMessage(e.target.value)}
                    className="w-full h-[100px] p-3 border border-gray-200 rounded-[8px] text-[15px] resize-none focus:outline-none focus:border-gray-300"
                  />
                </div>
                
                <p className="text-[12px] text-gray-400 mb-6">你需要发送验证申请，等待对方通过</p>

                <div className="flex items-center justify-center gap-3 mb-6">
                  <button 
                    onClick={() => {
                      setShowApplyModal(false);
                      setShowAddFriendModal(false);
                    }}
                    className="w-[100px] py-2 bg-gray-100/80 text-gray-600 rounded-[8px] text-[15px] font-medium active:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    onClick={() => {
                      onAddFriend(searchResult);
                      setShowApplyModal(false);
                      setShowAddFriendModal(false);
                    }}
                    className="w-[100px] py-2 bg-[#2b2b2b] text-white rounded-[8px] text-[15px] font-medium active:bg-black transition-colors"
                  >
                    发送
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showPayScreen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 bg-[#f7f7f7] z-[120] flex flex-col pt-4"
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
            <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-white shadow-sm relative z-20">
              <button onClick={() => setShowPayScreen(false)} className="p-2 -ml-2 text-gray-800 active:bg-gray-100 rounded-full transition-colors z-10">
                <ChevronLeft size={24} strokeWidth={2} />
              </button>
              <span className="text-[17px] font-medium text-gray-800 absolute left-1/2 -translate-x-1/2">
                支付
              </span>
              <div className="w-10 flex justify-end items-center mr-1">
                <MoreHorizontal size={24} strokeWidth={2} className="text-[#333]" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto w-full flex flex-col p-4 bg-[#f7f7f7] gap-4">
              <div className="bg-white rounded-[16px] border border-gray-100 shadow-[0_1px_8px_rgba(0,0,0,0.03)] flex flex-col overflow-hidden">
                <div className="pt-8 pb-5 flex flex-col items-center border-b border-gray-100 mx-5 relative">
                  <div className="w-[52px] h-[52px] mb-3 relative flex items-center justify-center">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="5" width="20" height="14" rx="2" stroke="#4AAB76" strokeWidth="1.5"/>
                      <circle cx="12" cy="12" r="3" stroke="#4AAB76" strokeWidth="1.5"/>
                      <path d="M5 12h2M17 12h2" stroke="#4AAB76" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span className="text-[15px] font-medium text-gray-800 mb-1">零钱</span>
                  <span className="text-[13px] text-gray-400 mb-1">余额(元)</span>
                  <span className="text-[40px] font-medium text-gray-800 tracking-tight leading-none mb-1">
                    {walletBalance.toFixed(2)}
                  </span>
                </div>
                <div className="py-3 text-center">
                  <span className="text-[12px] text-gray-400">可用于消费、转账、发红包</span>
                </div>
              </div>

              <div 
                className="bg-white rounded-[12px] border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] p-4 flex items-center justify-between active:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('showBankAlert'));
                }}
              >
                <div className="flex items-center gap-3">
                  <CreditCard size={22} className="text-gray-500" strokeWidth={1.5} />
                  <div className="flex flex-col">
                    <span className="text-[16px] text-[#333333]">银行卡</span>
                    <span className="text-[12px] text-gray-400">已绑定{bankCards.length}张</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-[#cccccc]" />
              </div>
            </div>
            
            <BankAlertModal bankCards={bankCards} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const BankAlertModal = ({ bankCards }: { bankCards: any[] }) => {
  const [show, setShow] = useState(false);
  
  React.useEffect(() => {
    const handleShow = () => setShow(true);
    window.addEventListener('showBankAlert', handleShow);
    return () => window.removeEventListener('showBankAlert', handleShow);
  }, []);
  
  if (!show) return null;
  
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[200]" onClick={() => setShow(false)} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] max-w-[320px] bg-white rounded-[8px] z-[210] flex flex-col shadow-xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <span className="text-[17px] font-medium text-[#111]">银行卡</span>
          <button onClick={() => setShow(false)} className="text-gray-400">
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>
        
        <div className="flex flex-col items-center pt-10 pb-8 px-6 max-h-[400px] overflow-y-auto">
          {bankCards.length === 0 ? (
            <>
              <div className="w-[54px] h-[36px] bg-[#fcfbfa] rounded-[4px] relative mb-5 shadow-sm border border-[#e8e8e8] overflow-hidden flex flex-col">
                <div className="w-full h-[8px] bg-[#d9d9d9] mt-1"></div>
                <div className="flex-1 px-1.5 py-1">
                  <div className="w-[80%] h-[2px] bg-[#e4eef6] rounded-full mb-1"></div>
                  <div className="w-[50%] h-[2px] bg-[#f0f0f0] rounded-full"></div>
                </div>
              </div>
              <span className="text-[16px] text-gray-500 mb-10">暂无银行卡</span>
            </>
          ) : (
            <div className="w-full flex flex-col gap-3 mb-6">
              {bankCards.map((card, idx) => (
                <div key={idx} className="w-full p-4 rounded-[8px] border border-gray-200 flex items-center justify-between">
                  <span className="text-[15px] font-medium text-gray-800">尾号 8888</span>
                  <span className="text-[14px] text-gray-400">¥{card.balance.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
          
          <button 
            className="w-[90%] py-3.5 rounded-[8px] border-[1.5px] border-dashed border-[#d5d5d5] flex items-center justify-center gap-1.5 active:bg-gray-50 transition-colors"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('addFakeBankCard'));
              setShow(false);
            }}
          >
            <Plus size={18} className="text-[#666]" strokeWidth={2} />
            <span className="text-[16px] text-[#666]">添加银行卡</span>
          </button>
        </div>
      </motion.div>
    </>
  );
}

export { WechatScreen as WechatApp };
