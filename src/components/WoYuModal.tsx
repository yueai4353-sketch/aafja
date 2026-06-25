import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, Pencil, Undo2 } from 'lucide-react';
import { activateProp, loadPropList, savePropList, buildEntryNarration, getActiveRecord, deactivateProp, revokeActiveProp, WoKongActiveRecord } from '../utils/woKongManager';

// ── Tag Input 组件 ──────────────────────────────────────────
interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

const TagInput: React.FC<TagInputProps> = ({ tags, onChange, placeholder = '输入后按回车或逗号' }) => {
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (raw: string) => {
    const v = raw.trim().replace(/[，,]/g, '');
    if (v && !tags.includes(v)) {
      onChange([...tags, v]);
    }
    setInputVal('');
  };

  const removeTag = (idx: number) => {
    onChange(tags.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
      e.preventDefault();
      addTag(inputVal);
    } else if (e.key === 'Backspace' && inputVal === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const handleBlur = () => {
    if (inputVal.trim()) addTag(inputVal);
  };

  return (
    <div
      className="flex flex-wrap gap-1.5 min-h-[40px] px-2.5 py-2 border border-gray-200 rounded-[8px] bg-white cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-[6px] text-[13px]"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(i); }}
            className="text-gray-400 hover:text-gray-600 leading-none"
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[80px] h-[22px] outline-none text-[14px] text-gray-800 placeholder-gray-300 bg-transparent"
      />
    </div>
  );
};
// ───────────────────────────────────────────────────────────

export interface WoYuProp {
  id: number;
  name: string;
  emoji: string;
  shape: string;
  usage: string;
  charKnowledge: string;
  triggerMode: 'immediate' | 'condition';
  triggerKeywords: string[];
  triggerCount: number;
  triggerTimeout: string;
  entryNarration: string;
  buff: string;
  exitMode: 'messages' | 'time' | 'keyword';
  exitMessages: number;
  exitMinutes: number;
  exitKeywords: string[];
  exitKeywordCount: number;
  exitNarration: string;
}

interface WoYuModalProps {
  visible: boolean;
  onClose: () => void;
  onSendProp: (desc: string) => void;
  contactId?: string;
}

const EMPTY_FORM: Omit<WoYuProp, 'id'> = {
  name: '',
  emoji: '',
  shape: '',
  usage: '',
  charKnowledge: '',
  triggerMode: 'immediate' as const,
  triggerKeywords: [],
  triggerCount: 1,
  triggerTimeout: '',
  entryNarration: '',
  buff: '',
  exitMode: 'messages' as const,
  exitMessages: 10,
  exitMinutes: 30,
  exitKeywords: [],
  exitKeywordCount: 3,
  exitNarration: '',
};

/** localStorage 里旧数据可能是字符串，做兼容转换 */
function normalizePropList(raw: unknown[]): WoYuProp[] {
  return raw.map((r: any) => ({
    ...r,
    triggerKeywords: Array.isArray(r.triggerKeywords)
      ? r.triggerKeywords
      : r.triggerKeywords ? r.triggerKeywords.split(/[,，\n]+/).map((s: string) => s.trim()).filter(Boolean) : [],
    exitKeywords: Array.isArray(r.exitKeywords)
      ? r.exitKeywords
      : r.exitKeywords ? r.exitKeywords.split(/[,，\n]+/).map((s: string) => s.trim()).filter(Boolean) : [],
  }));
}

const WoYuModal: React.FC<WoYuModalProps> = ({ visible, onClose, onSendProp, contactId }) => {
  const [props, setProps] = useState<WoYuProp[]>(() =>
    contactId ? normalizePropList(loadPropList(contactId)) : []
  );
  const [showForm, setShowForm] = useState(false);
  /** 正在编辑的道具 id，null 表示新建 */
  const [editingId, setEditingId] = useState<number | null>(null);
  /** 当前激活的道具记录（用于显示 chip 和阻止重复激活） */
  const [activeRecord, setActiveRecord] = useState<WoKongActiveRecord | null>(null);

  // 每次弹窗显示时刷新 activeRecord
  useEffect(() => {
    if (visible && contactId) {
      setActiveRecord(getActiveRecord(contactId));
    }
    if (!visible) {
      setShowForm(false);
    }
  }, [visible, contactId]);

  // contactId 切换时重新加载对应道具列表
  const prevContactIdRef = useRef(contactId);
  useEffect(() => {
    if (contactId !== prevContactIdRef.current) {
      prevContactIdRef.current = contactId;
      setProps(contactId ? normalizePropList(loadPropList(contactId)) : []);
      setActiveRecord(contactId ? getActiveRecord(contactId) : null);
    }
  }, [contactId]);

  /** 更新道具列表并同步持久化 */
  const updateProps = (updater: (prev: WoYuProp[]) => WoYuProp[]) => {
    setProps(prev => {
      const next = updater(prev);
      if (contactId) savePropList(contactId, next as any);
      return next;
    });
  };
  /** 正在确认"递给 ta"的道具，null 表示未开启确认弹窗 */
  const [sendConfirmProp, setSendConfirmProp] = useState<WoYuProp | null>(null);

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [shape, setShape] = useState('');
  const [usage, setUsage] = useState('');
  const [charKnowledge, setCharKnowledge] = useState('');
  const [triggerMode, setTriggerMode] = useState<'immediate' | 'condition'>('immediate');
  const [triggerKeywords, setTriggerKeywords] = useState<string[]>([]);
  const [triggerCount, setTriggerCount] = useState(1);
  const [triggerTimeout, setTriggerTimeout] = useState('');
  const [entryNarration, setEntryNarration] = useState('');
  const [buff, setBuff] = useState('');
  const [exitMode, setExitMode] = useState<'messages' | 'time' | 'keyword'>('messages');
  const [exitMessages, setExitMessages] = useState(10);
  const [exitMinutes, setExitMinutes] = useState(30);
  const [exitKeywords, setExitKeywords] = useState<string[]>([]);
  const [exitKeywordCount, setExitKeywordCount] = useState(3);
  const [exitNarration, setExitNarration] = useState('');

  const fillForm = (p: Omit<WoYuProp, 'id'> | typeof EMPTY_FORM) => {
    setName(p.name);
    setEmoji(p.emoji);
    setShape(p.shape);
    setUsage(p.usage);
    setCharKnowledge(p.charKnowledge);
    setTriggerMode(p.triggerMode);
    setTriggerKeywords(p.triggerKeywords);
    setTriggerCount(p.triggerCount);
    setTriggerTimeout(p.triggerTimeout);
    setEntryNarration(p.entryNarration);
    setBuff(p.buff);
    setExitMode(p.exitMode);
    setExitMessages(p.exitMessages);
    setExitMinutes(p.exitMinutes);
    setExitKeywords(p.exitKeywords);
    setExitKeywordCount(p.exitKeywordCount);
    setExitNarration(p.exitNarration);
  };

  const openNewForm = () => {
    setEditingId(null);
    fillForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (prop: WoYuProp) => {
    setEditingId(prop.id);
    fillForm(prop);
    setShowForm(true);
  };

  const canSave = name.trim() && usage.trim() && charKnowledge.trim();

  const buildProp = (id: number): WoYuProp => ({
    id,
    name: name.trim(),
    emoji: emoji.trim(),
    shape: shape.trim(),
    usage: usage.trim(),
    charKnowledge: charKnowledge.trim(),
    triggerMode,
    triggerKeywords: triggerKeywords,
    triggerCount,
    triggerTimeout: triggerTimeout.trim(),
    entryNarration: entryNarration.trim(),
    buff: buff.trim(),
    exitMode,
    exitMessages,
    exitMinutes,
    exitKeywords: exitKeywords,
    exitKeywordCount,
    exitNarration: exitNarration.trim(),
  });

  const handleSave = () => {
    if (!canSave) return;
    if (editingId !== null) {
      updateProps(prev => prev.map(p => p.id === editingId ? buildProp(editingId) : p));
    } else {
      updateProps(prev => [...prev, buildProp(Date.now())]);
    }
    setShowForm(false);
  };

  const handleSaveAndSend = () => {
    if (!canSave || activeRecord) return;
    const id = editingId ?? Date.now();
    const p = buildProp(id);
    if (editingId !== null) {
      updateProps(prev => prev.map(x => x.id === editingId ? p : x));
    } else {
      updateProps(prev => [...prev, p]);
    }
    // 将道具快照写入 woKongManager，state 由 triggerMode 决定
    if (contactId) {
      const exitModeNorm = p.exitMode === 'messages' ? 'msgCount' : p.exitMode === 'time' ? 'duration' : 'keyword';
      const endConfig: any = { mode: exitModeNorm };
      if (p.exitMode === 'messages') endConfig.msgCount = p.exitMessages;
      if (p.exitMode === 'time') endConfig.durationMin = p.exitMinutes;
      if (p.exitMode === 'keyword') {
        endConfig.keywords = p.exitKeywords;
        endConfig.hitCount = p.exitKeywordCount;
      }
      const triggerConfig: any = { mode: p.triggerMode === 'immediate' ? 'immediate' : 'keyword' };
      if (p.triggerMode === 'condition') {
        triggerConfig.keywords = p.triggerKeywords;
        triggerConfig.hitCount = p.triggerCount;
        const timeout = parseInt(p.triggerTimeout, 10);
        triggerConfig.timeoutMsgs = isNaN(timeout) ? null : Math.max(1, timeout);
      }
      activateProp(
        contactId,
        {
          name: p.name,
          emoji: p.emoji,
          appearance: p.shape,
          charCognition: p.charKnowledge,
          usage: p.usage,
          buffEffect: p.buff,
          exitNarration: p.exitNarration,
          trigger: triggerConfig,
          end: endConfig,
        } as any,
        p.triggerMode === 'immediate' ? 'active' : 'pending',
        p.id,
        p.exitMode,
        p.exitMessages,
      );
    }
    const desc = `[我控道具·${p.name}${p.emoji ? ' ' + p.emoji : ''}]\n用法：${p.usage}\n角色认知：${p.charKnowledge}${p.shape ? '\n外观：' + p.shape : ''}`;
    onSendProp(desc);
    // 入场旁白
    const entryText = buildEntryNarration(p.name, p.emoji, p.entryNarration);
    onSendProp(entryText);
    setShowForm(false);
    onClose();
  };

  /** 从列表直接"递给 ta"：已有激活时拦截，否则弹确认弹窗 */
  const handleSendConfirm = (prop: WoYuProp) => {
    if (activeRecord) return;
    setSendConfirmProp(prop);
  };

  /** 确认弹窗里点"确认" */
  const handleSendConfirmOk = () => {
    const p = sendConfirmProp;
    if (!p) return;
    setSendConfirmProp(null);
    if (contactId) {
      const exitModeNorm = p.exitMode === 'messages' ? 'msgCount' : p.exitMode === 'time' ? 'duration' : 'keyword';
      const endConfig: any = { mode: exitModeNorm };
      if (p.exitMode === 'messages') endConfig.msgCount = p.exitMessages;
      if (p.exitMode === 'time') endConfig.durationMin = p.exitMinutes;
      if (p.exitMode === 'keyword') {
        endConfig.keywords = p.exitKeywords;
        endConfig.hitCount = p.exitKeywordCount;
      }
      const triggerConfig: any = { mode: p.triggerMode === 'immediate' ? 'immediate' : 'keyword' };
      if (p.triggerMode === 'condition') {
        triggerConfig.keywords = p.triggerKeywords;
        triggerConfig.hitCount = p.triggerCount;
        const timeout = parseInt(p.triggerTimeout, 10);
        triggerConfig.timeoutMsgs = isNaN(timeout) ? null : Math.max(1, timeout);
      }
      activateProp(
        contactId,
        {
          name: p.name,
          emoji: p.emoji,
          appearance: p.shape,
          charCognition: p.charKnowledge,
          usage: p.usage,
          buffEffect: p.buff,
          exitNarration: p.exitNarration,
          trigger: triggerConfig,
          end: endConfig,
        } as any,
        p.triggerMode === 'immediate' ? 'active' : 'pending',
        p.id,
        p.exitMode,
        p.exitMessages,
      );
    }
    const desc = `[我控道具·${p.name}${p.emoji ? ' ' + p.emoji : ''}]\n用法：${p.usage}\n角色认知：${p.charKnowledge}${p.shape ? '\n外观：' + p.shape : ''}`;
    onSendProp(desc);
    // 入场旁白
    const entryText = buildEntryNarration(p.name, p.emoji, p.entryNarration);
    onSendProp(entryText);
    onClose();
  };

  /** 激活状态 chip 文本 */
  const activeChipText = (): string => {
    if (!activeRecord) return '';
    const item = activeRecord.itemSnapshot as any;
    const n = item?.name || '道具';
    const e = item?.emoji ? item.emoji + ' ' : '';
    if (activeRecord.state === 'pending') {
      const need = item?.trigger?.hitCount ?? 1;
      const got = (activeRecord as any).triggerHitCounter ?? 0;
      return `${e}${n} · 待触发 ${got}/${need}`;
    }
    const end = item?.end || {};
    if (end.mode === 'msgCount') {
      const left = Math.max(0, (activeRecord as any).msgCounterRemaining ?? 0);
      return `${e}${n} · 还剩 ${left} 条`;
    }
    if (end.mode === 'duration') {
      const ref = (activeRecord as any).activatedAt ?? (activeRecord as any).deliveredAt;
      const left = Math.max(0, (end.durationMin ?? 0) - Math.floor((Date.now() - ref) / 60000));
      return `${e}${n} · 还剩 ${left} 分钟`;
    }
    if (end.mode === 'keyword') {
      const need = end.hitCount ?? 1;
      const got = (activeRecord as any).endHitCounter ?? 0;
      return `${e}${n} · 命中 ${got}/${need}`;
    }
    return `${e}${n} · 生效中`;
  };

  /** 触发描述文本 */
  const triggerDesc = (p: WoYuProp) => {
    if (p.triggerMode === 'immediate') return '立即触发';
    if (p.triggerKeywords.length > 0) return `关键词「${p.triggerKeywords.join('/')}」命中 ${p.triggerCount} 次`;
    return `条件触发（命中 ${p.triggerCount} 次）`;
  };

  /** 退场描述文本 */
  const exitDesc = (p: WoYuProp) => {
    if (p.exitMode === 'messages') return `${p.exitMessages} 条消息后`;
    if (p.exitMode === 'time') return `${p.exitMinutes} 分钟后`;
    if (p.exitKeywords.length > 0) return `关键词「${p.exitKeywords.join('/')}」命中 ${p.exitKeywordCount} 次后`;
    return `关键词触发后`;
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            key="woyu-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowForm(false); onClose(); }}
            className="fixed inset-0 bg-black/40 z-[200]"
          />

          {/* ── 递给 ta？确认弹窗 ── */}
          <AnimatePresence>
            {sendConfirmProp && (
              <>
                <motion.div
                  key="send-confirm-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSendConfirmProp(null)}
                  className="fixed inset-0 z-[220]"
                />
                <motion.div
                  key="send-confirm-modal"
                  initial={{ opacity: 0, scale: 0.94, y: -12, x: '-50%' }}
                  animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
                  exit={{ opacity: 0, scale: 0.94, y: -12, x: '-50%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                  className="fixed top-1/2 left-1/2 w-[84%] max-w-[340px] bg-white rounded-[20px] z-[230] flex flex-col overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
                >
                  {/* 标题 */}
                  <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <span className="text-[18px] font-semibold text-gray-800">递给 ta？</span>
                    <button
                      onClick={() => setSendConfirmProp(null)}
                      className="text-gray-400 active:text-gray-600 p-1 -mr-1"
                    >
                      <X size={20} strokeWidth={2} />
                    </button>
                  </div>
                  <div className="h-px bg-gray-100 mx-0" />

                  {/* 道具信息 */}
                  <div className="px-5 py-5 flex flex-col gap-3">
                    {/* 名字行 */}
                    <div className="flex items-center gap-2">
                      <span className="text-[22px]">{sendConfirmProp.emoji || '🎴'}</span>
                      <span className="text-[16px] font-semibold text-gray-800">{sendConfirmProp.name}</span>
                    </div>
                    {/* 属性列表 */}
                    <div className="flex flex-col gap-2 text-[14px] text-gray-600">
                      {sendConfirmProp.usage && (
                        <div className="flex gap-2">
                          <span className="text-gray-400 shrink-0">用法：</span>
                          <span>{sendConfirmProp.usage}</span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <span className="text-gray-400 shrink-0">触发：</span>
                        <span>{triggerDesc(sendConfirmProp)}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-gray-400 shrink-0">退场：</span>
                        <span>{exitDesc(sendConfirmProp)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-gray-100" />

                  {/* 底部按钮 */}
                  <div className="flex gap-3 px-5 py-4">
                    <button
                      onClick={() => setSendConfirmProp(null)}
                      className="flex-1 py-2.5 bg-[#f2f2f2] text-gray-700 rounded-[10px] text-[15px] font-medium active:bg-gray-200 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSendConfirmOk}
                      className="flex-1 py-2.5 bg-[#1a1a1a] text-white rounded-[10px] text-[15px] font-medium active:bg-black transition-colors"
                    >
                      确认
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {!showForm ? (
              /* ── 道具列表弹窗 ── */
              <motion.div
                key="woyu-list"
                initial={{ opacity: 0, scale: 0.94, y: -12, x: '-50%' }}
                animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
                exit={{ opacity: 0, scale: 0.94, y: -12, x: '-50%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                className="fixed top-1/2 left-1/2 w-[88%] max-w-[360px] bg-white rounded-[20px] z-[210] flex flex-col overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.14)]"
                style={{ maxHeight: '75vh' }}
              >
                {/* 标题栏 */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                  <span className="text-[17px] font-medium text-gray-800">我控</span>
                  <div className="flex items-center gap-1">
                    {activeRecord && (
                      <button
                        onClick={() => {
                          if (!confirm('确定撤回当前生效的道具？')) return;
                          if (contactId) {
                            const revokeNarration = revokeActiveProp(contactId);
                            setActiveRecord(null);
                            if (revokeNarration) onSendProp(revokeNarration);
                          }
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-[8px] text-[12px] text-rose-500 bg-rose-50 active:bg-rose-100 transition-colors"
                        title="撤回当前道具"
                      >
                        <Undo2 size={13} strokeWidth={2} />
                        <span>撤回</span>
                      </button>
                    )}
                    <button
                      onClick={() => onClose()}
                      className="text-gray-400 active:text-gray-600 p-1 -mr-1"
                    >
                      <X size={20} strokeWidth={2} />
                    </button>
                  </div>
                </div>

                {/* 激活中道具 chip */}
                {activeRecord && (
                  <div className={`mx-4 mt-3 mb-1 px-3 py-2 rounded-[10px] flex items-center gap-2 text-[13px] ${
                    activeRecord.state === 'pending'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    <span className="shrink-0">{activeRecord.state === 'pending' ? '⏳' : '✦'}</span>
                    <span className="flex-1 truncate">{activeChipText()}</span>
                    {/* 撤回按钮 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!confirm('确定撤回当前生效的道具？')) return;
                        if (contactId) {
                          const revokeNarration = revokeActiveProp(contactId);
                          setActiveRecord(null);
                          if (revokeNarration) onSendProp(revokeNarration);
                        }
                      }}
                      className={`shrink-0 w-5 h-5 flex items-center justify-center rounded-full opacity-60 hover:opacity-100 transition-opacity ${
                        activeRecord.state === 'pending' ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                      title="撤回道具"
                    >
                      <X size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                )}

                {/* 道具列表 */}
                <div className="flex-1 overflow-y-auto no-scrollbar">
                  {props.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <span className="text-[28px]">🪄</span>
                      <span className="text-[14px] text-gray-400">还没有道具，造一个吧</span>
                    </div>
                  ) : (
                    <div className="flex flex-col divide-y divide-gray-100">
                      {props.map(prop => (
                        <div key={prop.id} className="flex items-center gap-3 px-5 py-3.5">
                          <span className="text-[22px] shrink-0">{prop.emoji || '🎴'}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[15px] font-medium text-gray-800">{prop.name}</div>
                            {prop.usage && (
                              <div className="text-[12px] text-gray-400 truncate mt-0.5">{prop.usage}</div>
                            )}
                          </div>
                          {/* 递给 ta 按钮（有激活道具时禁用） */}
                          <button
                            onClick={() => handleSendConfirm(prop)}
                            disabled={!!activeRecord}
                            className={`shrink-0 p-1.5 transition-colors ${activeRecord ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 active:text-gray-700'}`}
                          >
                            <ChevronLeft size={16} strokeWidth={2} />
                          </button>
                          {/* 编辑按钮 */}
                          <button
                            onClick={() => openEditForm(prop)}
                            className="shrink-0 p-1.5 text-gray-400 active:text-gray-700 -mr-1"
                          >
                            <Pencil size={16} strokeWidth={2} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 新建按钮 */}
                <div className="px-5 pb-6 pt-3 shrink-0 border-t border-gray-100">
                  <button
                    onClick={openNewForm}
                    className="w-full py-3 bg-[#1a1a1a] text-white rounded-[12px] text-[15px] font-medium active:bg-black transition-colors"
                  >
                    + 新建道具
                  </button>
                </div>
              </motion.div>
            ) : (
              /* ── 新建/编辑道具表单弹窗 ── */
              <motion.div
                key="woyu-form"
                initial={{ opacity: 0, scale: 0.94, y: -12, x: '-50%' }}
                animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
                exit={{ opacity: 0, scale: 0.94, y: -12, x: '-50%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                className="fixed top-1/2 left-1/2 w-[84%] max-w-[340px] bg-white rounded-[20px] z-[210] flex flex-col overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.14)]"
                style={{ maxHeight: '82vh' }}
              >
                {/* 标题栏 */}
                <div className="flex items-center px-4 py-4 border-b border-gray-100 shrink-0">
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-gray-600 active:text-gray-800 p-1 -ml-1 mr-1"
                  >
                    <ChevronLeft size={22} strokeWidth={2} />
                  </button>
                  <span className="flex-1 text-center text-[17px] font-medium text-gray-800 -ml-7">
                    {editingId !== null ? '编辑道具' : '新建道具'}
                  </span>
                  <button
                    onClick={() => { setShowForm(false); onClose(); }}
                    className="text-gray-400 active:text-gray-600 p-1 -mr-1"
                  >
                    <X size={20} strokeWidth={2} />
                  </button>
                </div>

                {/* 表单 */}
                <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 flex flex-col gap-4">
                  {/* 名字 */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] text-gray-500">
                      名字 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="桂花糕"
                      className="w-full h-10 px-3 border border-gray-200 rounded-[8px] text-[14px] text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400 bg-white"
                    />
                  </div>

                  {/* emoji */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] text-gray-500">emoji（可选）</label>
                    <input
                      type="text"
                      value={emoji}
                      onChange={e => setEmoji(e.target.value)}
                      placeholder="🪡"
                      maxLength={4}
                      className="w-[72px] h-[44px] px-2 border border-gray-200 rounded-[10px] text-[22px] text-center focus:outline-none focus:border-gray-400 bg-white"
                    />
                  </div>

                  {/* 形态/外观 */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] text-gray-500">形态/外观（可选）</label>
                    <textarea
                      value={shape}
                      onChange={e => setShape(e.target.value)}
                      placeholder="如：透明圆糖、散发桂花香"
                      className="w-full h-[68px] px-3 py-2 border border-gray-200 rounded-[8px] text-[14px] text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400 bg-white resize-none"
                    />
                  </div>

                  {/* 用法/功能 */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] text-gray-500">
                      用法/功能 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={usage}
                      onChange={e => setUsage(e.target.value)}
                      placeholder="如：含化后释放安神成分，让人犯困"
                      className="w-full h-[68px] px-3 py-2 border border-gray-200 rounded-[8px] text-[14px] text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400 bg-white resize-none"
                    />
                  </div>

                  {/* char 认知 */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] text-gray-500">
                      char 认知 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={charKnowledge}
                      onChange={e => setCharKnowledge(e.target.value)}
                      placeholder="角色对这个道具的认知或反应..."
                      className="w-full h-[68px] px-3 py-2 border border-gray-200 rounded-[8px] text-[14px] text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400 bg-white resize-none"
                    />
                  </div>

                  {/* ── 入场区块 ── */}
                  <div className="flex flex-col gap-3 pt-1">
                    <span className="text-[14px] font-medium text-gray-700">入场</span>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] text-gray-500">触发时机</label>
                      <div className="flex bg-[#f2f2f2] rounded-[10px] p-[3px] gap-[3px]">
                        <button
                          type="button"
                          onClick={() => setTriggerMode('immediate')}
                          className={`flex-1 py-2 rounded-[8px] text-[13px] font-medium transition-colors ${
                            triggerMode === 'immediate'
                              ? 'bg-[#1a1a1a] text-white shadow-sm'
                              : 'text-gray-500 active:bg-gray-200'
                          }`}
                        >
                          立即触发
                        </button>
                        <button
                          type="button"
                          onClick={() => setTriggerMode('condition')}
                          className={`flex-1 py-2 rounded-[8px] text-[13px] font-medium transition-colors ${
                            triggerMode === 'condition'
                              ? 'bg-[#1a1a1a] text-white shadow-sm'
                              : 'text-gray-500 active:bg-gray-200'
                          }`}
                        >
                          条件触发
                        </button>
                      </div>
                    </div>

                    {triggerMode === 'condition' && (
                      <>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] text-gray-500">触发关键词（回车或逗号分隔）</label>
                          <TagInput tags={triggerKeywords} onChange={setTriggerKeywords} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] text-gray-500">命中几次后触发</label>
                          <input
                            type="number"
                            min={1}
                            value={triggerCount}
                            onChange={e => setTriggerCount(Math.max(1, Number(e.target.value)))}
                            className="w-full h-10 px-3 border border-gray-200 rounded-[8px] text-[14px] text-gray-800 focus:outline-none focus:border-gray-400 bg-white"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] text-gray-500">未触发超时（消息数，可选）</label>
                          <input
                            type="text"
                            value={triggerTimeout}
                            onChange={e => setTriggerTimeout(e.target.value)}
                            placeholder="留空＝一直等"
                            className="w-full h-10 px-3 border border-gray-200 rounded-[8px] text-[14px] text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400 bg-white"
                          />
                        </div>
                      </>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] text-gray-500">入场旁白（可选，留空自动生成）</label>
                      <textarea
                        value={entryNarration}
                        onChange={e => setEntryNarration(e.target.value)}
                        placeholder="[你的手心被塞进一颗温热的糖]"
                        className="w-full h-[68px] px-3 py-2 border border-gray-200 rounded-[8px] text-[14px] text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400 bg-white resize-none"
                      />
                    </div>
                  </div>

                  {/* ── 持续区块 ── */}
                  <div className="flex flex-col gap-3 pt-1">
                    <span className="text-[14px] font-medium text-gray-700">持续</span>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] text-gray-500">生效中的表现 / buff（可选）</label>
                      <textarea
                        value={buff}
                        onChange={e => setBuff(e.target.value)}
                        placeholder="如：思维变慢、频繁打哈欠、回话变短"
                        className="w-full h-[68px] px-3 py-2 border border-gray-200 rounded-[8px] text-[14px] text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400 bg-white resize-none"
                      />
                    </div>
                  </div>

                  {/* ── 退场区块 ── */}
                  <div className="flex flex-col gap-3 pt-1">
                    <span className="text-[14px] font-medium text-gray-700">退场</span>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] text-gray-500">
                        结束条件 <span className="text-red-500">*</span>
                      </label>
                      <div className="flex bg-[#f2f2f2] rounded-[10px] p-[3px] gap-[3px]">
                        {(['messages', 'time', 'keyword'] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setExitMode(mode)}
                            className={`flex-1 py-2 rounded-[8px] text-[12px] font-medium transition-colors ${
                              exitMode === mode
                                ? 'bg-[#1a1a1a] text-white shadow-sm'
                                : 'text-gray-500 active:bg-gray-200'
                            }`}
                          >
                            {mode === 'messages' ? '消息数' : mode === 'time' ? '时间' : '关键词'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {exitMode === 'messages' && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] text-gray-500">经过 N 条 char 消息后结束</label>
                        <input
                          type="number"
                          min={1}
                          value={exitMessages}
                          onChange={e => setExitMessages(Math.max(1, Number(e.target.value)))}
                          className="w-full h-10 px-3 border border-gray-200 rounded-[8px] text-[14px] text-gray-800 focus:outline-none focus:border-gray-400 bg-white"
                        />
                      </div>
                    )}

                    {exitMode === 'time' && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] text-gray-500">经过 N 分钟后结束</label>
                        <input
                          type="number"
                          min={1}
                          value={exitMinutes}
                          onChange={e => setExitMinutes(Math.max(1, Number(e.target.value)))}
                          className="w-full h-10 px-3 border border-gray-200 rounded-[8px] text-[14px] text-gray-800 focus:outline-none focus:border-gray-400 bg-white"
                        />
                      </div>
                    )}

                    {exitMode === 'keyword' && (
                      <>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] text-gray-500">结束关键词</label>
                          <TagInput tags={exitKeywords} onChange={setExitKeywords} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] text-gray-500">命中几次后结束</label>
                          <input
                            type="number"
                            min={1}
                            value={exitKeywordCount}
                            onChange={e => setExitKeywordCount(Math.max(1, Number(e.target.value)))}
                            className="w-full h-10 px-3 border border-gray-200 rounded-[8px] text-[14px] text-gray-800 focus:outline-none focus:border-gray-400 bg-white"
                          />
                        </div>
                      </>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] text-gray-500">结束旁白（可选，留空自动生成）</label>
                      <textarea
                        value={exitNarration}
                        onChange={e => setExitNarration(e.target.value)}
                        placeholder="[桂花糕的效果消退了]"
                        className="w-full h-[68px] px-3 py-2 border border-gray-200 rounded-[8px] text-[14px] text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400 bg-white resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 底部按钮 */}
                <div className="px-5 pb-6 pt-3 shrink-0 border-t border-gray-100 flex gap-2">
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 bg-[#f2f2f2] text-gray-700 rounded-[10px] text-[14px] font-medium active:bg-gray-200 transition-colors"
                  >
                    返回
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!canSave}
                    className={`flex-1 py-2.5 rounded-[10px] text-[14px] font-medium transition-colors ${canSave ? 'bg-[#1a1a1a] text-white active:bg-black' : 'bg-gray-200 text-gray-400'}`}
                  >
                    保存
                  </button>
                  <button
                    onClick={handleSaveAndSend}
                    disabled={!canSave}
                    className={`flex-[1.4] py-2.5 rounded-[10px] text-[13px] font-medium transition-colors ${canSave ? 'bg-[#1a1a1a] text-white active:bg-black' : 'bg-gray-200 text-gray-400'}`}
                  >
                    递给 ta
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
};

export default WoYuModal;
