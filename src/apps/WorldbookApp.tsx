import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Moon, Signal, Wifi, Battery, ChevronLeft, Download, Upload, Menu, ChevronDown, Plus, X, Trash2, Check, ChevronRight } from 'lucide-react';
import { CurrentTime } from '../components';

interface WorldbookEntry {
  id: string;
  keys: string;
  content: string;
}

interface Worldbook {
  id: string;
  name: string;
  category: string;
  readOrder: string;
  editMode: 'simple' | 'entry';
  content: string;
  entries: WorldbookEntry[];
}

export const WorldbookApp = ({ onBack, key }: { onBack: () => void, key?: React.Key }) => {
  const [books, setBooks] = useState<Worldbook[]>(() => {
    const savedBooks = localStorage.getItem('os_worldbooks');
    if (savedBooks) {
      try {
        const parsed = JSON.parse(savedBooks);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [];
  });
  const [currentView, setCurrentView] = useState<'list' | 'edit'>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [editingBook, setEditingBook] = useState<Worldbook | null>(null);

  // 分类管理状态
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('os_worldbook_categories');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return ['总是', '世界观', '角色库', '规则'];
  });
  const [showCategoryPanel, setShowCategoryPanel] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  // 分类折叠状态：key=分类名, value=是否展开
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const pressTimerRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('os_worldbooks', JSON.stringify(books));
  }, [books]);

  useEffect(() => {
    localStorage.setItem('os_worldbook_categories', JSON.stringify(categories));
  }, [categories]);

  const saveCategories = (newCats: string[]) => {
    setCategories(newCats);
    localStorage.setItem('os_worldbook_categories', JSON.stringify(newCats));
  };

  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name || categories.includes(name)) return;
    saveCategories([...categories, name]);
    setNewCategoryName('');
  };

  const handleDeleteCategory = (cat: string) => {
    saveCategories(categories.filter(c => c !== cat));
    // 将使用该分类的世界书重置为未分类
    const updated = books.map(b => b.category === cat ? { ...b, category: '未分类' } : b);
    saveBooks(updated);
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // 按分类分组世界书（包含"未分类"兜底）
  const groupedBooks = () => {
    const allCats = ['未分类', ...categories];
    const groups: { cat: string; items: Worldbook[] }[] = [];
    allCats.forEach(cat => {
      const items = books.filter(b => {
        const bc = b.category || '';
        if (cat === '未分类') return !bc || !categories.includes(bc);
        return bc === cat;
      });
      if (items.length > 0) groups.push({ cat, items });
    });
    return groups;
  };

  const saveBooks = (newBooks: Worldbook[]) => {
    setBooks(newBooks);
    localStorage.setItem('os_worldbooks', JSON.stringify(newBooks));
  };

  const handleCreateConfirm = () => {
    if (!createName.trim()) return;
    const newBook: Worldbook = {
      id: `wb_${Date.now()}`,
      name: createName.trim(),
      category: '未分类',
      readOrder: '中 - 正常读取',
      editMode: 'simple',
      content: '',
      entries: [{ id: `ent_${Date.now()}`, keys: '', content: '' }]
    };
    setEditingBook(newBook);
    setCurrentView('edit');
    setShowCreateModal(false);
    setCreateName('');
  };

  const handleSaveBook = () => {
    if (!editingBook) return;
    const existingIndex = books.findIndex(b => b.id === editingBook.id);
    let newBooks = [...books];
    if (existingIndex >= 0) {
      newBooks[existingIndex] = editingBook;
    } else {
      newBooks = [editingBook, ...newBooks];
    }
    saveBooks(newBooks);
    setCurrentView('list');
    setEditingBook(null);
  };

  const handleAddEntry = () => {
    if (!editingBook) return;
    setEditingBook({
      ...editingBook,
      entries: [...editingBook.entries, { id: `ent_${Date.now()}`, keys: '', content: '' }]
    });
  };

  const handleUpdateEntry = (id: string, field: 'keys' | 'content', value: string) => {
    if (!editingBook) return;
    setEditingBook({
      ...editingBook,
      entries: editingBook.entries.map(e => e.id === id ? { ...e, [field]: value } : e)
    });
  };

  const handleDeleteEntry = (id: string) => {
    if (!editingBook) return;
    setEditingBook({
      ...editingBook,
      entries: editingBook.entries.filter(e => e.id !== id)
    });
  };

  const handleDeleteSelected = () => {
    const newBooks = books.filter(b => !selectedIds.includes(b.id));
    saveBooks(newBooks);
    setSelectionMode(false);
    setSelectedIds([]);
    setShowDeleteConfirm(false);
  };

  const handlePointerDown = (id: string) => {
    if (selectionMode) return;
    pressTimerRef.current = setTimeout(() => {
      setSelectionMode(true);
      setSelectedIds([id]);
    }, 500);
  };

  const cancelLongPress = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 15 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 bg-[#FAFAFA] z-[60] flex flex-col pt-4"
    >
      {currentView === 'list' && (
        <>
          {/* Header */}
          {selectionMode ? (
            <div className="flex items-center justify-between px-4 py-2 shrink-0 bg-white border-b border-gray-100 relative z-50 h-[52px]">
              <button onClick={() => { setSelectionMode(false); setSelectedIds([]); }} className="text-[15px] text-gray-500 font-medium">取消</button>
              <span className="text-[16px] font-medium text-gray-900 absolute left-1/2 -translate-x-1/2">
                已选择 {selectedIds.length} 个
              </span>
              <button 
                onClick={() => selectedIds.length > 0 && setShowDeleteConfirm(true)} 
                className={`text-[15px] font-medium transition-colors ${selectedIds.length > 0 ? 'text-[#333]' : 'text-gray-300'}`}
              >
                删除
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 py-2 shrink-0 bg-white border-b border-gray-100 relative z-50 h-[52px]">
              <div className="flex items-center gap-2 lg:gap-3 w-[100px]">
                <button onClick={onBack} className="p-2 -ml-1 text-gray-800 active:bg-gray-100 rounded-full transition-colors">
                  <ChevronLeft size={24} strokeWidth={2} />
                </button>
                <button className="p-1.5 text-gray-700 active:bg-gray-100 rounded-full transition-colors hidden sm:block">
                  <Download size={20} strokeWidth={1.5} />
                </button>
                <button className="p-1.5 text-gray-700 active:bg-gray-100 rounded-full transition-colors hidden sm:block">
                  <Upload size={20} strokeWidth={1.5} />
                </button>
              </div>
              
              <span className="text-[17px] font-medium text-gray-900 absolute left-1/2 -translate-x-1/2 tracking-wide">
                世界书
              </span>

              <div className="flex items-center gap-2 lg:gap-3 shrink-0">
                <button onClick={() => setShowCategoryPanel(true)} className="p-1.5 text-gray-700 active:bg-gray-100 rounded-full transition-colors">
                  <Menu size={20} strokeWidth={1.5} />
                </button>
                <button className="p-1.5 text-gray-700 active:bg-gray-100 rounded-full transition-colors">
                  <ChevronDown size={20} strokeWidth={1.5} />
                </button>
                <button onClick={() => setShowCreateModal(true)} className="p-1.5 text-gray-900 active:bg-gray-100 rounded-full transition-colors">
                  <Plus size={24} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-y-auto w-full relative">
            {books.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center -mt-10">
                <div className="mb-6 relative flex items-center">
                  <svg width="84" height="64" viewBox="0 0 84 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 16L0 32L12 48V16Z" fill="#a3a3a3" />
                    <rect x="14" y="10" width="48" height="42" rx="4" stroke="#a3a3a3" strokeWidth="3" fill="transparent" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-[15px] text-[#999999] mb-4 tracking-wider">暂无世界书</span>
                <span className="text-[13px] text-[#cccccc] font-light tracking-wider">点击右上角+号创建</span>
              </div>
            ) : (
              <div className="p-4 flex flex-col gap-4">
                {groupedBooks().map(({ cat, items }) => {
                  const isExpanded = expandedCategories[cat] === true; // 默认折叠
                  return (
                    <div key={cat} className="flex flex-col gap-2">
                      {/* 分类标题行 */}
                      <button
                        onClick={() => toggleCategory(cat)}
                        className="flex items-center justify-between px-1 py-1 active:opacity-70 transition-opacity"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-gray-500 tracking-wide uppercase">{cat}</span>
                          <span className="text-[12px] text-gray-400">{items.length}</span>
                        </div>
                        <ChevronRight
                          size={16}
                          className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      </button>

                      {/* 该分类下的世界书卡片 */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="flex flex-col gap-2 overflow-hidden"
                          >
                            {items.map(book => {
                              const isSelected = selectedIds.includes(book.id);
                              return (
                                <div
                                  key={book.id}
                                  onPointerDown={() => handlePointerDown(book.id)}
                                  onPointerUp={cancelLongPress}
                                  onPointerCancel={cancelLongPress}
                                  onMouseLeave={cancelLongPress}
                                  onClick={() => {
                                    if (selectionMode) {
                                      setSelectedIds(prev => prev.includes(book.id) ? prev.filter(id => id !== book.id) : [...prev, book.id]);
                                    } else {
                                      setEditingBook(book); setCurrentView('edit');
                                    }
                                  }}
                                  className={`bg-white p-4 rounded-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] border flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden ${selectionMode && isSelected ? 'border-gray-800 ring-[1.5px] ring-gray-800' : 'border-gray-100'}`}
                                >
                                  <div className="flex flex-col flex-1 pl-1">
                                    <span className="text-[16px] font-medium text-gray-900 mb-1 line-clamp-1">{book.name}</span>
                                    <div className="flex flex-row items-center">
                                      <span className="text-[13px] text-gray-500">{book.editMode === 'simple' ? 1 : book.entries.length}个条目 · </span>
                                      <span className="text-[12px] text-gray-400 ml-1">
                                        {new Date(parseInt(book.id.split('_')[1] || Date.now().toString())).toLocaleDateString('zh-CN', {month: 'numeric', day: 'numeric'})}
                                      </span>
                                    </div>
                                  </div>
                                  {selectionMode && (
                                    <div className="ml-4 shrink-0 pr-1">
                                      {isSelected ? (
                                        <div className="w-[22px] h-[22px] rounded-full bg-[#333] flex items-center justify-center">
                                          <Check size={14} className="text-white" strokeWidth={3} />
                                        </div>
                                      ) : (
                                        <div className="w-[22px] h-[22px] rounded-full border-[1.5px] border-gray-300" />
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {currentView === 'edit' && editingBook && (
        <>
          <div className="flex items-center justify-between px-3 py-2 shrink-0 bg-white border-b border-gray-100 relative z-50">
            <button onClick={() => setCurrentView('list')} className="p-2 -ml-1 text-gray-800 active:bg-gray-100 rounded-full transition-colors flex items-center justify-center w-10">
              <ChevronLeft size={24} strokeWidth={2} />
            </button>
            <span className="text-[17px] font-medium text-gray-900 absolute left-1/2 -translate-x-1/2 tracking-wide">
              {books.find(b => b.id === editingBook.id) ? editingBook.name : '新建世界书'}
            </span>
            <button onClick={handleSaveBook} className="text-[15px] text-gray-800 font-medium px-3 py-1.5 active:bg-gray-100 rounded-full transition-colors">
              保存
            </button>
          </div>

          <div className="flex-1 overflow-y-auto w-full pb-10">
            <div className="p-4 flex flex-col gap-5">
              {/* 书名 */}
              <div className="flex flex-col gap-2">
                <label className="text-[14px] text-gray-600">书名 <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={editingBook.name}
                  onChange={(e) => setEditingBook({ ...editingBook, name: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-[12px] px-4 py-3 text-[15px] text-gray-800 focus:outline-none focus:border-gray-400"
                />
              </div>

              {/* 分类 */}
              <div className="flex flex-col gap-2">
                <label className="text-[14px] text-gray-600">分类</label>
                <div className="relative">
                  <select 
                    value={editingBook.category}
                    onChange={(e) => setEditingBook({ ...editingBook, category: e.target.value })}
                    className="w-full appearance-none bg-white border border-gray-200 rounded-[12px] px-4 py-3 text-[15px] text-gray-800 focus:outline-none focus:border-gray-400"
                  >
                    <option value="未分类">未分类</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* 读取顺序 */}
              <div className="flex flex-col gap-2">
                <label className="text-[14px] text-gray-600">读取顺序</label>
                <div className="relative">
                  <select 
                    value={editingBook.readOrder}
                    onChange={(e) => setEditingBook({ ...editingBook, readOrder: e.target.value })}
                    className="w-full appearance-none bg-white border border-gray-200 rounded-[12px] px-4 py-3 text-[15px] text-gray-800 focus:outline-none focus:border-gray-400"
                  >
                    <option value="强制 - 优先读取">强制 - 优先读取</option>
                    <option value="先 - 稍前读取">先 - 稍前读取</option>
                    <option value="中 - 正常读取">中 - 正常读取</option>
                    <option value="后 - 靠后读取">后 - 靠后读取</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <span className="text-[12px] text-gray-400 px-1 mt-0.5">AI读取世界书时的顺序：强制 {'->'} 先 {'->'} 中 {'->'} 后</span>
              </div>

              {/* 编辑模式 */}
              <div className="flex flex-col gap-2 mt-2">
                <label className="text-[14px] text-gray-600">编辑模式</label>
                <div className="flex bg-[#F2F2F2] rounded-[12px] p-1">
                  <button 
                    onClick={() => setEditingBook({ ...editingBook, editMode: 'simple' })}
                    className={`flex-1 py-2.5 text-[14px] font-medium rounded-[10px] transition-all ${editingBook.editMode === 'simple' ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] text-gray-900' : 'text-gray-500'}`}
                  >
                    简单模式
                  </button>
                  <button 
                    onClick={() => setEditingBook({ ...editingBook, editMode: 'entry' })}
                    className={`flex-1 py-2.5 text-[14px] font-medium rounded-[10px] transition-all ${editingBook.editMode === 'entry' ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] text-gray-900' : 'text-gray-500'}`}
                  >
                    条目模式
                  </button>
                </div>
                <span className="text-[12px] text-gray-400 px-1 mt-1">
                  简单模式：内容始终注入AI · 条目模式：关键词触发时才注入
                </span>
              </div>

              <div className="flex items-center text-[13px] text-gray-500 px-1 mt-1">
                字数：{editingBook.editMode === 'simple' ? editingBook.content.length : editingBook.entries.reduce((a, b) => a + b.content.length, 0)}
              </div>

              {/* 内容区 */}
              {editingBook.editMode === 'simple' ? (
                <div className="flex flex-col gap-2 mt-1 relative">
                  <label className="text-[14px] text-gray-600">内容 <span className="text-red-500">*</span></label>
                  <div className="relative w-full rounded-[16px] bg-white border border-gray-200 overflow-hidden min-h-[300px]">
                    {!editingBook.content && (
                      <div className="absolute inset-0 p-4 pointer-events-none text-gray-400 text-[14px] whitespace-pre-wrap leading-relaxed">
                        {'在这里输入人设补充、背景设定、规则等...\n\n示例：\n【背景设定】\n故事发生在2077年的赛博朋克都市，科技高度发达但贫富分化严重。\n\n【角色补充】\n主角是一名黑客，擅长网络入侵和信息窃取。\n\n【对话规则】\n- 回复要简短自然，像真人聊天'}
                      </div>
                    )}
                    <textarea 
                      value={editingBook.content}
                      onChange={(e) => setEditingBook({ ...editingBook, content: e.target.value })}
                      className="w-full h-full min-h-[300px] bg-transparent resize-none focus:outline-none p-4 text-[15px] text-gray-800 leading-relaxed relative z-10"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 mt-1">
                  <label className="text-[14px] text-gray-600">词条列表</label>
                  <div className="flex flex-col gap-4">
                    {editingBook.entries.map((entry, index) => (
                      <div key={entry.id} className="bg-white border border-gray-200 rounded-[16px] p-4 relative shadow-sm">
                        
                        <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                          <span className="text-[14px] font-medium text-gray-700">词条 {index + 1}</span>
                          <button onClick={() => handleDeleteEntry(entry.id)} className="text-gray-400 active:text-red-500 p-1">
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] text-gray-500">触发关键字 <span className="text-red-400">*</span></label>
                            <input 
                              type="text" 
                              value={entry.keys}
                              onChange={(e) => handleUpdateEntry(entry.id, 'keys', e.target.value)}
                              placeholder="多个关键字用逗号分隔，如：黑客,入侵"
                              className="w-full bg-[#fcfcfc] border border-gray-200 rounded-[8px] px-3 py-2 text-[14px] text-gray-800 focus:outline-none focus:border-gray-400"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] text-gray-500">内容 <span className="text-red-400">*</span></label>
                            <textarea 
                              value={entry.content}
                              onChange={(e) => handleUpdateEntry(entry.id, 'content', e.target.value)}
                              placeholder="当关键词触发时，注入AI的背景设定内容..."
                              className="w-full bg-[#fcfcfc] border border-gray-200 rounded-[8px] px-3 py-2 text-[14px] text-gray-800 focus:outline-none focus:border-gray-400 resize-none min-h-[100px] leading-relaxed"
                            />
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                  
                  <button 
                    onClick={handleAddEntry}
                    className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 bg-[#fbfbfb] rounded-[16px] py-6 active:bg-gray-50 transition-colors"
                  >
                    <Plus size={24} className="text-gray-400 mb-2" />
                    <span className="text-[14px] text-gray-500 font-medium">添加词条</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Create Modal overlay */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 z-[100] flex items-center justify-center px-6"
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateModal(false)}></div>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[16px] w-full max-w-[320px] shadow-2xl relative z-10 overflow-hidden flex flex-col"
            >
              <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
                <span className="text-[16px] font-medium text-gray-900">创建世界书</span>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 active:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-5 pb-6">
                <div className="relative">
                  <input 
                    type="text" 
                    autoFocus
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="请输入世界书名称"
                    className="w-full bg-[#FAFAFA] border border-gray-200 rounded-[12px] px-4 py-3 text-[15px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white transition-colors"
                  />
                  <p className="text-[12px] text-gray-400 mt-3 ml-1">
                    例如：角色背景设定、世界观规则等
                  </p>
                </div>
              </div>

              <div className="flex gap-0 border-t border-gray-100 bg-gray-50/50 p-4">
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 text-[15px] font-medium text-gray-600 bg-[#F4F4F5] rounded-[10px] mr-2 active:bg-gray-200"
                >
                  取消
                </button>
                <button 
                  onClick={handleCreateConfirm}
                  className="flex-1 py-3 text-[15px] font-medium text-white bg-[#333333] rounded-[10px] ml-2 active:bg-black"
                >
                  确定
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 分类管理面板 */}
      <AnimatePresence>
        {showCategoryPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-end justify-center"
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => { setShowCategoryPanel(false); setNewCategoryName(''); }} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 bg-white rounded-t-[24px] w-full max-w-md pb-8 shadow-2xl"
            >
              {/* 顶部把手 */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-200" />
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <span className="text-[17px] font-semibold text-gray-900">分类管理</span>
                <button onClick={() => { setShowCategoryPanel(false); setNewCategoryName(''); }} className="text-gray-400 active:text-gray-600 p-1">
                  <X size={20} />
                </button>
              </div>

              {/* 分类列表 */}
              <div className="px-5 pt-4 flex flex-col gap-2 max-h-[40vh] overflow-y-auto">
                {categories.length === 0 && (
                  <p className="text-[13px] text-gray-400 text-center py-4">暂无分类，请在下方添加</p>
                )}
                {categories.map(cat => (
                  <div key={cat} className="flex items-center justify-between bg-[#F8F8F8] rounded-[12px] px-4 py-3">
                    <span className="text-[15px] text-gray-800">{cat}</span>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="text-gray-400 active:text-red-500 p-1 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* 添加新分类 */}
              <div className="px-5 pt-4 flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                  placeholder="输入新分类名称"
                  className="flex-1 bg-[#F8F8F8] border border-gray-200 rounded-[12px] px-4 py-2.5 text-[15px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-gray-400"
                />
                <button
                  onClick={handleAddCategory}
                  className="bg-[#333] text-white rounded-[12px] px-4 py-2.5 text-[15px] font-medium active:bg-black transition-colors shrink-0"
                >
                  添加
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 z-[110] flex items-center justify-center px-6"
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowDeleteConfirm(false)}></div>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[16px] w-full max-w-[300px] shadow-2xl relative z-10 overflow-hidden flex flex-col p-5 pb-4"
            >
              <div className="text-[16px] text-gray-800 leading-relaxed font-medium mb-6 mt-1 text-center">
                确定要删除选中的 {selectedIds.length} 个世界书吗？此操作不可恢复。
              </div>

              <div className="flex justify-end gap-6 px-2">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-[15px] font-medium text-[#007AFF] active:opacity-70"
                >
                  取消
                </button>
                <button 
                  onClick={handleDeleteSelected}
                  className="text-[15px] font-medium text-[#007AFF] active:opacity-70"
                >
                  好
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};
