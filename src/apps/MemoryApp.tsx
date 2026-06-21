import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Moon, Signal, Wifi, Battery, ChevronLeft, ChevronRight, Search, Gem, BookOpen, Lightbulb, Heart, UserCircle, Palette, LineChart, Settings, Plus, Clock, Star } from 'lucide-react';
import { CurrentTime } from '../components';

interface MemoryAppProps {
  onBack: () => void;
  personas: any[];
}

// 月份记忆详细页面组件
const PlotMemoryMonthDetail = ({ year, month, records, onBack, onEdit, onDelete }: { year: string, month: string, records: any[], onBack: () => void, onEdit: (record: any) => void, onDelete: (record: any) => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 bg-[#FBFBFB] z-[110] flex flex-col"
    >
      {/* 顶部状态栏 */}
      <div className="flex justify-between items-center px-6 pt-3 pb-2 text-[13px] font-medium text-gray-800 shrink-0 bg-transparent relative z-10">
        <div className="flex items-center">
          <CurrentTime /> <Moon size={11} className="ml-1 opacity-80" fill="currentColor" strokeWidth={1} />
        </div>
        <div className="flex items-center gap-1.5 opacity-60">
          <Signal size={14} strokeWidth={2.5} />
          <div className="font-bold tracking-tighter text-[10px] uppercase">5G</div>
          <Wifi size={14} strokeWidth={2.5} />
          <Battery size={16} strokeWidth={2} />
        </div>
      </div>

      {/* 标题栏 */}
      <div className="px-5 py-2 flex items-center justify-between relative shrink-0 border-b border-gray-100/50 pb-4">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 rounded-full active:bg-gray-200 transition-colors z-10"
        >
          <ChevronLeft size={24} className="text-gray-800" strokeWidth={2} />
        </button>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h1 className="text-[17px] font-medium text-gray-900 tracking-wide">
            {year}年{month}月
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        {records.length > 0 ? (
          <div className="space-y-4">
            {records.map((record, idx) => (
              <div key={idx} className="bg-white border border-[#E8F0E4] rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <div className="flex flex-col mb-3">
                  <span className="text-[15px] font-medium text-gray-800 mb-1.5">{record.content}</span>
                  <div className="flex items-center text-[12px] text-gray-400 gap-1">
                    <Clock size={12} className="text-gray-400" />
                    <span>{record.theme || '手动添加'} · {record.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-[#F2F7F0] text-[#7A9E72] px-2 py-0.5 rounded-full text-[11px]">{record.theme || '手动记录'}</span>
                  {record.emotion && (
                    <span className="bg-pink-50 text-[#E5B5B5] px-2 py-0.5 rounded-full text-[11px]">{record.emotion}</span>
                  )}
                  <span className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1">
                    <Star size={10} fill="currentColor" /> {Number(record.importance).toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mb-4">
                  <div className="w-2 h-2 rounded-full bg-[#7A9E72]"></div>
                  <span className="text-[13px] text-gray-600">清晰</span>
                </div>
                <div className="flex justify-end gap-2">
                  <button className="px-4 py-1.5 rounded-lg border border-[#E8F0E4] text-gray-600 text-[12px] active:bg-gray-50 transition-colors">标为核心</button>
                  <button 
                    onClick={() => onEdit(record)}
                    className="px-4 py-1.5 rounded-lg border border-[#E8F0E4] text-gray-600 text-[12px] active:bg-gray-50 transition-colors"
                  >
                    编辑
                  </button>
                  <button 
                    onClick={() => onDelete(record)}
                    className="px-4 py-1.5 rounded-lg border border-[#E8F0E4] text-[#E5B5B5] text-[12px] active:bg-pink-50 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-[100px] text-center">
            <p className="text-[15px] text-[#E5B5B5] tracking-wide">这个月还没有情节记忆</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// 情节记忆详细页面组件
const PlotMemoryYearDetail = ({ year, records, onBack, onEdit, onDelete }: { year: string, records: any[], onBack: () => void, onEdit: (record: any) => void, onDelete: (record: any) => void }) => {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // 按类型分组记忆
  const yearOnlyMemories = records.filter(r => !r.hasMonth);
  const monthMemories = records.filter(r => r.hasMonth);

  // 按月份分组
  const memoriesByMonth = monthMemories.reduce((acc, curr) => {
    if (!acc[curr.month]) {
      acc[curr.month] = [];
    }
    acc[curr.month].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  const months = Object.keys(memoriesByMonth).sort((a, b) => parseInt(a) - parseInt(b));

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 bg-[#FBFBFB] z-[100] flex flex-col"
    >
      {/* 顶部状态栏 */}
      <div className="flex justify-between items-center px-6 pt-3 pb-2 text-[13px] font-medium text-gray-800 shrink-0 bg-transparent relative z-10">
        <div className="flex items-center">
          <CurrentTime /> <Moon size={11} className="ml-1 opacity-80" fill="currentColor" strokeWidth={1} />
        </div>
        <div className="flex items-center gap-1.5 opacity-60">
          <Signal size={14} strokeWidth={2.5} />
          <div className="font-bold tracking-tighter text-[10px] uppercase">5G</div>
          <Wifi size={14} strokeWidth={2.5} />
          <Battery size={16} strokeWidth={2} />
        </div>
      </div>

      {/* 标题栏 */}
      <div className="px-5 py-2 flex items-center justify-between relative shrink-0 border-b border-gray-100/50 pb-4">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 rounded-full active:bg-gray-200 transition-colors z-10"
        >
          <ChevronLeft size={24} className="text-gray-800" strokeWidth={2} />
        </button>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h1 className="text-[17px] font-medium text-gray-900 tracking-wide">
            {year}
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        {records.length > 0 ? (
          <div className="space-y-4">
            {/* 【年份】记忆卡片 */}
            {yearOnlyMemories.length > 0 && (
              <div 
                className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
              >
                <div className="flex items-center gap-3">
                  <BookOpen size={20} className="text-[#E5B5B5]" strokeWidth={1.5} />
                  <span className="text-[15px] text-gray-800 font-medium">【年份】记忆</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[16px] text-[#C5A0A0] font-medium">{yearOnlyMemories.length}</span>
                </div>
              </div>
            )}

            {/* 显示年份记忆的卡片 */}
            {yearOnlyMemories.map((record, idx) => (
              <div key={`year-${idx}`} className="bg-white border border-[#E8F0E4] rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] ml-4">
                <div className="flex flex-col mb-3">
                  <span className="text-[15px] font-medium text-gray-800 mb-1.5">{record.content}</span>
                  <div className="flex items-center text-[12px] text-gray-400 gap-1">
                    <Clock size={12} className="text-gray-400" />
                    <span>{record.theme || '手动添加'} · {record.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-[#F2F7F0] text-[#7A9E72] px-2 py-0.5 rounded-full text-[11px]">{record.theme || '手动记录'}</span>
                  {record.emotion && (
                    <span className="bg-pink-50 text-[#E5B5B5] px-2 py-0.5 rounded-full text-[11px]">{record.emotion}</span>
                  )}
                  <span className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1">
                    <Star size={10} fill="currentColor" /> {Number(record.importance).toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mb-4">
                  <div className="w-2 h-2 rounded-full bg-[#7A9E72]"></div>
                  <span className="text-[13px] text-gray-600">清晰</span>
                </div>
                <div className="flex justify-end gap-2">
                  <button className="px-4 py-1.5 rounded-lg border border-[#E8F0E4] text-gray-600 text-[12px] active:bg-gray-50 transition-colors">标为核心</button>
                  <button 
                    onClick={() => onEdit(record)}
                    className="px-4 py-1.5 rounded-lg border border-[#E8F0E4] text-gray-600 text-[12px] active:bg-gray-50 transition-colors"
                  >
                    编辑
                  </button>
                  <button 
                    onClick={() => onDelete(record)}
                    className="px-4 py-1.5 rounded-lg border border-[#E8F0E4] text-[#E5B5B5] text-[12px] active:bg-pink-50 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}

            {/* 【月份】记忆卡片 */}
            {months.length > 0 && (
              <>
                <div 
                  className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)] mt-6"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen size={20} className="text-[#E5B5B5]" strokeWidth={1.5} />
                    <span className="text-[15px] text-gray-800 font-medium">【月份】记忆</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] text-[#C5A0A0] font-medium">{monthMemories.length}</span>
                  </div>
                </div>

                {/* 显示各个月份 */}
                {months.map(month => (
                  <div 
                    key={month}
                    onClick={() => setSelectedMonth(month)}
                    className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)] ml-4 active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[15px] text-gray-800 font-medium">{month}月</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[16px] text-[#C5A0A0] font-medium">{memoriesByMonth[month].length}</span>
                      <ChevronRight size={18} className="text-gray-300" />
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-[100px] text-center">
            <p className="text-[15px] text-[#E5B5B5] tracking-wide">这一年还没有情节记忆</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedMonth && (
          <PlotMemoryMonthDetail 
            year={year.replace('年', '')}
            month={selectedMonth}
            records={memoriesByMonth[selectedMonth] || []}
            onBack={() => setSelectedMonth(null)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// 情节记忆界面组件
const PlotMemory = ({ onBack }: { onBack: () => void }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMemory, setEditingMemory] = useState<any | null>(null);
  const [content, setContent] = useState('');
  const [theme, setTheme] = useState('手动记录');
  const [emotion, setEmotion] = useState('');
  const [importance, setImportance] = useState('5');
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [memories, setMemories] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const [showDateOptions, setShowDateOptions] = useState(false);
  const [showManualDateInput, setShowManualDateInput] = useState(false);
  const [manualDateVal, setManualDateVal] = useState('');

  // 解析用户输入的日期文本为标准格式 YYYY-MM-DD
  const parseDateString = (input: string): string | null => {
    if (!input) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
    const match1 = input.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (match1) {
      const [, year, month, day] = match1;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    const match2 = input.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (match2) {
      const [, year, month, day] = match2;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    const match3 = input.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (match3) {
      const [, year, month, day] = match3;
      return `${year}-${month}-${day}`;
    }
    return null;
  };

  const getYearFromDate = (dateStr: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr.split('-')[0];
    }
    const nums = dateStr.match(/\d+/g);
    if (nums && nums[0].length === 4) {
      return nums[0];
    }
    return new Date().getFullYear().toString();
  };

  const getMonthFromDate = (dateStr: string): string | null => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr.split('-')[1];
    }
    const match = dateStr.match(/(\d{4})年(\d{1,2})月/);
    if (match) {
      return match[2].padStart(2, '0');
    }
    const nums = dateStr.match(/\d+/g);
    if (nums && nums.length >= 2 && nums[0].length === 4) {
      return nums[1].padStart(2, '0');
    }
    return null;
  };

  const hasMonthInfo = (dateStr: string): boolean => {
    // 检测日期字符串中是否包含月份信息
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return true;
    }
    if (/(\d{4})年(\d{1,2})月/.test(dateStr)) {
      return true;
    }
    if (/(\d{4})[-/](\d{1,2})/.test(dateStr)) {
      return true;
    }
    const nums = dateStr.match(/\d+/g);
    if (nums && nums.length >= 2 && nums[0].length === 4) {
      return true;
    }
    // 如果只有年份，则没有月份信息
    if (/^\d{4}年?$/.test(dateStr)) {
      return false;
    }
    return false;
  };

  const handleEditMemory = (record: any) => {
    setEditingMemory(record);
    setContent(record.content);
    setTheme(record.theme);
    setEmotion(record.emotion || '');
    setImportance(record.importance);
    setDate(record.date);
    setShowAddModal(true);
  };

  const handleDeleteMemory = (record: any) => {
    setMemories(prev => prev.filter(m => m.timestamp !== record.timestamp));
  };

  const handleAddMemory = () => {
    if (!content.trim()) return;
    
    const hasMonth = hasMonthInfo(date);
    const month = hasMonth ? getMonthFromDate(date) : null;
    
    if (editingMemory) {
      // 编辑现有记忆
      setMemories(prev => prev.map(m => 
        m.timestamp === editingMemory.timestamp 
          ? {
              ...m,
              content,
              theme,
              emotion,
              importance,
              date,
              year: getYearFromDate(date),
              month,
              hasMonth
            }
          : m
      ));
      setEditingMemory(null);
    } else {
      // 添加新记忆
      const newMemory = {
        content,
        theme,
        emotion,
        importance,
        date,
        year: getYearFromDate(date),
        month,
        hasMonth,
        timestamp: Date.now()
      };
      setMemories(prev => [newMemory, ...prev]);
    }
    
    // 关闭弹窗
    setShowAddModal(false);
    
    // Reset form
    setContent('');
    setTheme('手动记录');
    setEmotion('');
    setImportance('5');
    const d = new Date();
    setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  // Group memories by year
  const memoriesByYear = memories.reduce((acc, curr) => {
    if (!acc[curr.year]) {
      acc[curr.year] = [];
    }
    acc[curr.year].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  const years = Object.keys(memoriesByYear).sort((a, b) => parseInt(b) - parseInt(a));

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${year}年${parseInt(month)}月${parseInt(day)}日`;
    }
    return dateStr;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 bg-[#FBFBFB] z-[90] flex flex-col"
    >
      {/* 顶部状态栏 */}
      <div className="flex justify-between items-center px-6 pt-3 pb-2 text-[13px] font-medium text-gray-800 shrink-0 bg-transparent relative z-10">
        <div className="flex items-center">
          <CurrentTime /> <Moon size={11} className="ml-1 opacity-80" fill="currentColor" strokeWidth={1} />
        </div>
        <div className="flex items-center gap-1.5 opacity-60">
          <Signal size={14} strokeWidth={2.5} />
          <div className="font-bold tracking-tighter text-[10px] uppercase">5G</div>
          <Wifi size={14} strokeWidth={2.5} />
          <Battery size={16} strokeWidth={2} />
        </div>
      </div>

      {/* 标题栏 */}
      <div className="px-5 py-2 flex items-center justify-between relative shrink-0 border-b border-gray-100/50 pb-4">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 rounded-full active:bg-gray-200 transition-colors z-10"
        >
          <ChevronLeft size={24} className="text-gray-800" strokeWidth={2} />
        </button>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h1 className="text-[17px] font-medium text-gray-900 tracking-wide">
            情节记忆
          </h1>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="p-2 -mr-2 rounded-full active:bg-gray-200 transition-colors z-10"
        >
          <Plus size={24} className="text-[#E5B5B5]" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pt-6 px-5 pb-10">
        {years.length > 0 ? (
          <div className="space-y-4">
            {years.map(year => (
              <div 
                key={year}
                onClick={() => setSelectedYear(year)}
                className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <BookOpen size={20} className="text-[#E5B5B5]" strokeWidth={1.5} />
                  <span className="text-[15px] text-gray-800 font-medium">{year}年</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[16px] text-[#C5A0A0] font-medium">{memoriesByYear[year].length}</span>
                  <ChevronRight size={18} className="text-gray-300" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-[150px] text-center">
            <p className="text-[15px] text-[#E5B5B5] mb-5 tracking-wide">还没有情节记忆</p>
            <div className="text-[13px] text-[#B8B8B8] leading-[24px] tracking-wide font-light">
              <p>每天和 char 聊天会自动生成情节记忆</p>
              <p>也可以点击右上角 + 手动添加</p>
            </div>
          </div>
        )}
      </div>

      {/* 添加情节记忆弹窗 */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center px-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl w-full max-w-[340px] p-6 shadow-xl"
            >
              <h2 className="text-[17px] font-bold text-gray-800 mb-5">{editingMemory ? '编辑情节记忆' : '添加情节记忆'}</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] text-gray-600 mb-1.5">
                    记忆内容 <span className="text-[#E5B5B5]">*</span>
                  </label>
                  <textarea 
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="发生了什么..."
                    className="w-full h-[80px] resize-none border border-pink-100/80 rounded-xl p-3 text-[14px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#E5B5B5] focus:ring-1 focus:ring-[#E5B5B5]/20 transition-all bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-[13px] text-gray-600 mb-1.5">
                    主题
                  </label>
                  <input 
                    type="text"
                    value={theme}
                    onChange={e => setTheme(e.target.value)}
                    placeholder="手动记录"
                    className="w-full border border-pink-100/80 rounded-xl px-3 py-2.5 text-[14px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#E5B5B5] focus:ring-1 focus:ring-[#E5B5B5]/20 transition-all bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-[13px] text-gray-600 mb-1.5">
                    情绪
                  </label>
                  <input 
                    type="text"
                    value={emotion}
                    onChange={e => setEmotion(e.target.value)}
                    placeholder="例如：温馨、释怀、紧张...（每个词两个字）"
                    className="w-full border border-pink-100/80 rounded-xl px-3 py-2.5 text-[14px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#E5B5B5] focus:ring-1 focus:ring-[#E5B5B5]/20 transition-all bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-[13px] text-gray-600 mb-1.5">
                    重要性 (1-10)
                  </label>
                  <input 
                    type="number"
                    min="1" max="10"
                    value={importance}
                    onChange={e => setImportance(e.target.value)}
                    className="w-full border border-pink-100/80 rounded-xl px-3 py-2.5 text-[14px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#E5B5B5] focus:ring-1 focus:ring-[#E5B5B5]/20 transition-all bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-[13px] text-gray-600 mb-1.5">
                    日期
                  </label>
                  <div className="relative">
                    <input 
                      type="date"
                      ref={dateInputRef}
                      value={/^\d{4}-\d{2}-\d{2}$/.test(date) ? date : ''}
                      onChange={e => {
                        if (e.target.value) setDate(e.target.value);
                      }}
                      className="absolute w-0 h-0 opacity-0 pointer-events-none"
                    />
                    <div 
                      onClick={() => setShowDateOptions(true)}
                      className="w-full border border-pink-100/80 rounded-xl px-3 py-2.5 text-[14px] text-gray-800 text-center bg-white flex items-center justify-center cursor-pointer active:bg-gray-50 transition-colors"
                    >
                      {formatDateDisplay(date)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingMemory(null);
                    // Reset form
                    setContent('');
                    setTheme('手动记录');
                    setEmotion('');
                    setImportance('5');
                    const d = new Date();
                    setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                  }}
                  className="px-6 py-2 rounded-xl border border-pink-100/80 text-gray-600 text-[14px] font-medium active:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleAddMemory}
                  className="px-6 py-2 rounded-xl border border-[#E5B5B5] text-[#E5B5B5] text-[14px] font-medium active:bg-pink-50 transition-colors"
                >
                  {editingMemory ? '保存' : '添加'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 日期选项弹窗 */}
      <AnimatePresence>
        {showDateOptions && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[210] bg-black/20 flex items-center justify-center px-4"
            onClick={() => setShowDateOptions(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl w-[240px] overflow-hidden shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div 
                className="px-4 py-3.5 text-center text-[15px] text-gray-800 border-b border-gray-100 active:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setShowDateOptions(false);
                  setManualDateVal(formatDateDisplay(date));
                  setShowManualDateInput(true);
                }}
              >
                自行修改
              </div>
              <div 
                className="px-4 py-3.5 text-center text-[15px] text-gray-800 active:bg-gray-50 cursor-pointer relative"
                onClick={() => {
                  setShowDateOptions(false);
                  setTimeout(() => {
                    if (dateInputRef.current) {
                      try {
                        dateInputRef.current.showPicker();
                      } catch (e) {
                         dateInputRef.current.focus();
                      }
                    }
                  }, 50);
                }}
              >
                系统
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 自行修改日期弹窗 */}
      <AnimatePresence>
        {showManualDateInput && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[220] bg-black/40 flex items-center justify-center px-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl w-full max-w-[300px] p-6 shadow-xl"
            >
              <h2 className="text-[16px] font-bold text-gray-800 mb-4 text-center">输入日期</h2>
              <input 
                type="text"
                value={manualDateVal}
                onChange={e => setManualDateVal(e.target.value)}
                placeholder="例如：2026年6月21日"
                autoFocus
                className="w-full border border-pink-100/80 rounded-xl px-3 py-2.5 text-[14px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#E5B5B5] focus:ring-1 focus:ring-[#E5B5B5]/20 transition-all bg-white text-center"
              />
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={() => setShowManualDateInput(false)}
                  className="flex-1 py-2 rounded-xl border border-pink-100/80 text-gray-600 text-[14px] font-medium active:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={() => {
                    const inputText = manualDateVal.trim();
                    if (inputText) {
                      const parsed = parseDateString(inputText);
                      if (parsed) {
                        setDate(parsed);
                      } else {
                        const nums = inputText.match(/\d+/g);
                        if (nums && nums.length >= 3 && nums[0].length === 4) {
                          setDate(`${nums[0]}-${nums[1].padStart(2, '0')}-${nums[2].padStart(2, '0')}`);
                        } else {
                          setDate(inputText);
                        }
                      }
                    }
                    setShowManualDateInput(false);
                  }}
                  className="flex-1 py-2 rounded-xl border border-[#E5B5B5] text-[#E5B5B5] text-[14px] font-medium active:bg-pink-50 transition-colors"
                >
                  确认
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedYear && (
          <PlotMemoryYearDetail 
            year={`${selectedYear}年`}
            records={memoriesByYear[selectedYear] || []}
            onBack={() => setSelectedYear(null)}
            onEdit={handleEditMemory}
            onDelete={handleDeleteMemory}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// 记忆海界面组件
const MemorySea = ({ onBack }: { onBack: () => void }) => {
  const [showPlotMemory, setShowPlotMemory] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 bg-[#FBFBFB] z-[80] flex flex-col"
    >
      {/* 顶部状态栏 */}
      <div className="flex justify-between items-center px-6 pt-3 pb-2 text-[13px] font-medium text-gray-800 shrink-0 bg-transparent relative z-10">
        <div className="flex items-center">
          <CurrentTime /> <Moon size={11} className="ml-1 opacity-80" fill="currentColor" strokeWidth={1} />
        </div>
        <div className="flex items-center gap-1.5 opacity-60">
          <Signal size={14} strokeWidth={2.5} />
          <div className="font-bold tracking-tighter text-[10px] uppercase">5G</div>
          <Wifi size={14} strokeWidth={2.5} />
          <Battery size={16} strokeWidth={2} />
        </div>
      </div>

      {/* 标题栏 */}
      <div className="px-5 py-2 flex items-center relative shrink-0 border-b border-gray-100/50 pb-4">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 rounded-full active:bg-gray-200 transition-colors z-10"
        >
          <ChevronLeft size={24} className="text-gray-800" strokeWidth={2} />
        </button>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h1 className="text-[17px] font-medium text-gray-900 tracking-wide">
            记忆海
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-10 space-y-4">
        {/* 列表项 */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-[0.98] transition-transform cursor-pointer">
          <div className="flex items-center gap-3">
            <Gem size={20} className="text-[#E5B5B5]" strokeWidth={1.5} />
            <span className="text-[15px] text-gray-800 font-medium">核心记忆</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[16px] text-[#C5A0A0] font-medium">0</span>
            <ChevronRight size={18} className="text-gray-300" />
          </div>
        </div>

        <div 
          onClick={() => setShowPlotMemory(true)}
          className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-[0.98] transition-transform cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <BookOpen size={20} className="text-gray-400" strokeWidth={1.5} />
            <span className="text-[15px] text-gray-800 font-medium">情节记忆</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[16px] text-[#C5A0A0] font-medium">0</span>
            <ChevronRight size={18} className="text-gray-300" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-[0.98] transition-transform cursor-pointer">
          <div className="flex items-center gap-3">
            <Lightbulb size={20} className="text-gray-400" strokeWidth={1.5} />
            <span className="text-[15px] text-gray-800 font-medium">了解你</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[16px] text-[#C5A0A0] font-medium">0</span>
            <ChevronRight size={18} className="text-gray-300" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-[0.98] transition-transform cursor-pointer">
          <div className="flex items-center gap-3">
            <Heart size={20} className="text-[#E5B5B5]" strokeWidth={1.5} />
            <span className="text-[15px] text-gray-800 font-medium">情感印记</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[16px] text-[#C5A0A0] font-medium">0</span>
            <ChevronRight size={18} className="text-gray-300" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-[0.98] transition-transform cursor-pointer">
          <div className="flex items-center gap-3">
            <UserCircle size={20} className="text-gray-400" strokeWidth={1.5} />
            <span className="text-[15px] text-gray-800 font-medium">自我成长</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[16px] text-[#C5A0A0] font-medium">0</span>
            <ChevronRight size={18} className="text-gray-300" />
          </div>
        </div>

        {/* 情绪底色大卡片 */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] h-[140px] flex flex-col cursor-pointer active:scale-[0.98] transition-transform">
          <div className="flex items-center gap-2">
            <Palette size={18} className="text-gray-400" strokeWidth={1.5} />
            <span className="text-[15px] text-gray-800 font-medium">情绪底色</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[13px] text-gray-400 font-light">关系还在初步建立</span>
          </div>
        </div>

        {/* 底部网格 */}
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 shadow-[0_2px_10px_rgba(0,0,0,0.02)] cursor-pointer active:scale-[0.95] transition-transform relative">
            <LineChart size={24} className="text-gray-400" strokeWidth={1.5} />
            <span className="text-[13px] text-gray-700 font-medium mt-1">关系时间线</span>
            <ChevronRight size={14} className="text-gray-300 absolute right-4 bottom-5" />
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 shadow-[0_2px_10px_rgba(0,0,0,0.02)] cursor-pointer active:scale-[0.95] transition-transform relative">
            <Settings size={24} className="text-gray-400" strokeWidth={1.5} />
            <span className="text-[13px] text-gray-700 font-medium mt-1">记忆设置</span>
            <ChevronRight size={14} className="text-gray-300 absolute right-4 bottom-5" />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showPlotMemory && (
          <PlotMemory onBack={() => setShowPlotMemory(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// 记忆详情组件
const MemoryDetail = ({ persona, onBack }: { persona: any, onBack: () => void }) => {
  const name = persona.name || persona.real_name || persona.wechatName || '未命名';
  const identity = persona.identity || persona.bio || '无简介';
  const [showMemorySea, setShowMemorySea] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 bg-[#F9F9F9] z-[70] flex flex-col"
    >
      {/* 顶部状态栏 */}
      <div className="flex justify-between items-center px-6 pt-3 pb-2 text-[13px] font-medium text-gray-800 shrink-0 bg-transparent relative z-10">
        <div className="flex items-center">
          <CurrentTime /> <Moon size={11} className="ml-1 opacity-80" fill="currentColor" strokeWidth={1} />
        </div>
        <div className="flex items-center gap-1.5 opacity-60">
          <Signal size={14} strokeWidth={2.5} />
          <div className="font-bold tracking-tighter text-[10px] uppercase">5G</div>
          <Wifi size={14} strokeWidth={2.5} />
          <Battery size={16} strokeWidth={2} />
        </div>
      </div>

      {/* 标题栏 */}
      <div className="px-5 py-2 flex items-center relative shrink-0">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 rounded-full active:bg-gray-200 transition-colors z-10"
        >
          <ChevronLeft size={24} className="text-gray-800" strokeWidth={2} />
        </button>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h1 className="text-[18px] sm:text-[20px] font-medium text-black tracking-widest">
            记忆详情
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-6 px-5 flex flex-col items-center">
        {/* 头像 */}
        <div className="w-[80px] h-[80px] sm:w-[90px] sm:h-[90px] rounded-full overflow-hidden bg-gray-100 border-[2px] border-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] relative">
          {persona.avatar ? (
            <img src={persona.avatar} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 font-medium text-[24px]">
              {name.charAt(0)}
            </div>
          )}
        </div>

        {/* 姓名和描述 */}
        <div className="mt-4 text-center">
          <h2 className="text-[18px] sm:text-[20px] font-bold text-gray-900 tracking-wide">{name}</h2>
          <p className="text-[11px] sm:text-[12px] text-gray-400 mt-1.5 flex items-center justify-center gap-1">
            <span>Instagram · 助手</span>
          </p>
        </div>

        {/* 记忆卡片区域 */}
        <div className="w-full mt-6 px-2">
          <div 
            className="bg-white rounded-[24px] p-5 shadow-[0_8px_30px_rgba(255,192,203,0.15)] border border-pink-50/50 w-full relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => setShowMemorySea(true)}
          >
             {/* 装饰性背景光晕 */}
             <div className="absolute -top-10 -right-10 w-32 h-32 bg-pink-100/50 rounded-full blur-2xl pointer-events-none"></div>
             <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-50/50 rounded-full blur-2xl pointer-events-none"></div>
             
            <div className="flex items-center gap-4 relative z-10">
              <span className="text-[16px] font-bold text-gray-900 tracking-wider">记忆海</span>
              <span className="text-[13px] text-gray-400 font-light">暂无记忆</span>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showMemorySea && (
          <MemorySea onBack={() => setShowMemorySea(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const MemoryApp = ({ onBack, personas }: MemoryAppProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersona, setSelectedPersona] = useState<any | null>(null);

  const filteredPersonas = personas.filter(p => {
    const nameToMatch = p.name || p.real_name || p.wechatName || '';
    return nameToMatch.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 15 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 bg-[#F9F9F9] z-[60] flex flex-col"
    >
      {/* 顶部状态栏 */}
      <div className="flex justify-between items-center px-6 pt-3 pb-2 text-[13px] font-medium text-gray-800 shrink-0 bg-transparent relative z-10">
        <div className="flex items-center">
          <CurrentTime /> <Moon size={11} className="ml-1 opacity-80" fill="currentColor" strokeWidth={1} />
        </div>
        <div className="flex items-center gap-1.5 opacity-60">
          <Signal size={14} strokeWidth={2.5} />
          <div className="font-bold tracking-tighter text-[10px] uppercase">5G</div>
          <Wifi size={14} strokeWidth={2.5} />
          <Battery size={16} strokeWidth={2} />
        </div>
      </div>

      {/* 标题栏 */}
      <div className="px-5 py-2 flex items-center relative shrink-0">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 rounded-full active:bg-gray-200 transition-colors z-10"
        >
          <ChevronLeft size={24} className="text-gray-800" strokeWidth={2} />
        </button>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h1 className="text-[20px] font-medium text-black tracking-widest drop-shadow-[0_2px_10px_rgba(255,255,255,1)]">
            记忆
          </h1>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="px-5 py-3 shrink-0">
        <div className="flex items-center bg-white rounded-full px-4 py-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-50/50">
          <Search size={18} className="text-gray-400 mr-2" />
          <input 
            type="text" 
            placeholder="搜索联系人..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[15px] text-gray-800 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* 列表区域 */}
      <div className="flex-1 overflow-y-auto px-5 pb-[env(safe-area-inset-bottom,20px)] space-y-3 mt-2">
        {filteredPersonas.map((persona, index) => {
          const isHighlighted = index === 2;
          const name = persona.name || persona.real_name || persona.wechatName || '未命名';
          const identity = persona.identity || persona.bio || '无简介';

          return (
            <div 
              key={persona.id || index}
              onClick={() => setSelectedPersona(persona)}
              className={`flex items-center p-3 sm:p-4 rounded-[20px] sm:rounded-[24px] cursor-pointer transition-transform active:scale-95 ${
                isHighlighted 
                  ? 'bg-gradient-to-r from-pink-100 via-pink-200 to-pink-300 text-white shadow-sm' 
                  : 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)]'
              }`}
            >
              {/* 头像 */}
              <div className="w-[46px] h-[46px] sm:w-[52px] sm:h-[52px] rounded-full overflow-hidden shrink-0 bg-gray-100 border-2 border-white shadow-sm">
                {persona.avatar ? (
                  <img src={persona.avatar} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 font-medium text-[16px]">
                    {name.charAt(0)}
                  </div>
                )}
              </div>
              
              {/* 信息 */}
              <div className="ml-3 sm:ml-4 flex-1 min-w-0 flex flex-col justify-center">
                <div className={`text-[15px] sm:text-[16px] font-medium truncate ${isHighlighted ? 'text-white' : 'text-gray-900'}`}>
                  {name}
                </div>
                <div className={`text-[12px] sm:text-[13px] truncate mt-0.5 ${isHighlighted ? 'text-white/80' : 'text-gray-400'}`}>
                  {identity.length > 20 ? identity.substring(0, 20) + '...' : identity}
                </div>
              </div>
              
              {/* 右侧箭头 */}
              <div className={`ml-2 ${isHighlighted ? 'text-white/80' : 'text-gray-300'}`}>
                <ChevronRight size={20} strokeWidth={2} />
              </div>
            </div>
          );
        })}
        {filteredPersonas.length === 0 && (
          <div className="text-center text-gray-400 text-[14px] mt-10">
            暂无联系人
          </div>
        )}
      </div>

      {/* 记忆详情页面 */}
      <AnimatePresence>
        {selectedPersona && (
          <MemoryDetail 
            persona={selectedPersona} 
            onBack={() => setSelectedPersona(null)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};