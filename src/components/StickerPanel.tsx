import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Sticker, Heart, FileText, Trash2, X, Check, Edit2 } from 'lucide-react';

interface StickerItem {
  id: string;
  label: string;
  url: string;
}

interface StickerGroup {
  id: string;
  name: string;
  stickers: StickerItem[];
}

interface StickerPanelProps {
  onClose: () => void;
  onSendSticker: (stickerUrl: string, label?: string) => void;
}

const STORAGE_KEY = 'sticker_groups_v2';

function loadGroups(): StickerGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  // 默认分组
  return [{ id: 'default', name: '默认', stickers: [] }];
}

function saveGroups(groups: StickerGroup[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}

function parseImportText(text: string): Omit<StickerItem, 'id'>[] {
  const results: Omit<StickerItem, 'id'>[] = [];
  const lines = text.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const colonIdx = line.search(/[:：]/);
    if (colonIdx > 0) {
      const label = line.slice(0, colonIdx).trim();
      const rest = line.slice(colonIdx + 1).trim();
      const urlMatch = rest.match(/https?:\/\/[^\s]+/);
      if (urlMatch) { results.push({ label, url: urlMatch[0] }); continue; }
    }
    const urlMatch = line.match(/https?:\/\/[^\s]+/);
    if (urlMatch) results.push({ label: '', url: urlMatch[0] });
  }
  return results;
}

const StickerPanel: React.FC<StickerPanelProps> = ({ onClose, onSendSticker }) => {
  const [groups, setGroups] = useState<StickerGroup[]>(loadGroups);
  const [activeGroupId, setActiveGroupId] = useState<string>(() => loadGroups()[0]?.id || 'default');
  const [searchText, setSearchText] = useState('');

  // 管理模式
  const [manageMode, setManageMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 导入弹窗
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');

  // 新增分组弹窗
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // 重命名分组
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  // toast
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // 持久化
  useEffect(() => { saveGroups(groups); }, [groups]);

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  };

  const activeGroup = groups.find(g => g.id === activeGroupId) || groups[0];

  const filteredStickers = searchText.trim()
    ? groups.flatMap(g => g.stickers).filter(s => s.label.includes(searchText) || s.url.includes(searchText))
    : activeGroup?.stickers || [];

  // ── 上传本地图片 ──
  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const readers = files.map(file => new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onload = ev => resolve(ev.target?.result as string);
      reader.readAsDataURL(file);
    }));
    Promise.all(readers).then(urls => {
      const newItems: StickerItem[] = urls.map(url => ({ id: Date.now() + Math.random() + '', label: '', url }));
      setGroups(prev => prev.map(g =>
        g.id === activeGroupId ? { ...g, stickers: [...g.stickers, ...newItems] } : g
      ));
      if (urls.length === 1) {
        onSendSticker(urls[0]);
        onClose();
      } else {
        showToast(`已添加 ${urls.length} 张表情包`);
      }
    });
    e.target.value = '';
  };

  // ── 导入文字 ──
  const handleImportText = () => {
    const items = parseImportText(importText);
    if (items.length === 0) { alert('没有找到有效的图片网址，请检查格式'); return; }
    const newItems: StickerItem[] = items.map(it => ({ ...it, id: Date.now() + Math.random() + '' }));
    setGroups(prev => prev.map(g =>
      g.id === activeGroupId ? { ...g, stickers: [...g.stickers, ...newItems] } : g
    ));
    setImportText('');
    setShowImportModal(false);
    showToast(`已成功导入 ${items.length} 个表情包`);
  };

  // ── 导入文件 ──
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name.endsWith('.docx')) { alert('请将 docx 转为 txt 或 json 后导入'); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      let items: Omit<StickerItem, 'id'>[] = [];
      if (file.name.endsWith('.json')) {
        try {
          const data = JSON.parse(content);
          if (Array.isArray(data)) {
            data.forEach((item: unknown) => {
              if (item && typeof item === 'object') {
                const obj = item as Record<string, unknown>;
                const url = (obj['url'] || obj['src'] || obj['image'] || '') as string;
                const label = (obj['label'] || obj['name'] || obj['title'] || '') as string;
                if (url && /^https?:\/\//.test(url)) items.push({ label: String(label), url });
              }
            });
          }
          if (items.length === 0) {
            const matches = JSON.stringify(data).match(/https?:\/\/[^"'\s]+/g);
            if (matches) items = matches.map(url => ({ label: '', url }));
          }
        } catch { alert('JSON 解析失败'); return; }
      } else {
        items = parseImportText(content);
      }
      if (items.length === 0) { alert('没有找到有效的图片网址'); return; }
      const newItems: StickerItem[] = items.map(it => ({ ...it, id: Date.now() + Math.random() + '' }));
      setGroups(prev => prev.map(g =>
        g.id === activeGroupId ? { ...g, stickers: [...g.stickers, ...newItems] } : g
      ));
      setShowImportModal(false);
      showToast(`已成功导入 ${items.length} 个表情包`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── 删除选中 ──
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setGroups(prev => prev.map(g => ({
      ...g,
      stickers: g.stickers.filter(s => !selectedIds.has(s.id)),
    })));
    setSelectedIds(new Set());
    showToast(`已删除 ${selectedIds.size} 个表情包`);
  };

  // ── 新增分组 ──
  const handleAddGroup = () => {
    const name = newGroupName.trim() || `分组 ${groups.length + 1}`;
    const id = Date.now() + '';
    setGroups(prev => [...prev, { id, name, stickers: [] }]);
    setActiveGroupId(id);
    setNewGroupName('');
    setShowAddGroupModal(false);
  };

  // ── 删除分组 ──
  const handleDeleteGroup = (groupId: string) => {
    if (groups.length <= 1) { showToast('至少保留一个分组'); return; }
    setGroups(prev => prev.filter(g => g.id !== groupId));
    if (activeGroupId === groupId) setActiveGroupId(groups.find(g => g.id !== groupId)?.id || 'default');
  };

  // ── 重命名分组 ──
  const handleRenameGroup = () => {
    if (!renamingGroupId) return;
    const name = renameText.trim();
    if (!name) return;
    setGroups(prev => prev.map(g => g.id === renamingGroupId ? { ...g, name } : g));
    setRenamingGroupId(null);
    setRenameText('');
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/20" onClick={onClose} />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-[340px] left-1/2 -translate-x-1/2 z-[200] bg-[rgba(0,0,0,0.72)] text-white text-[14px] px-5 py-2.5 rounded-full whitespace-nowrap pointer-events-none"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="fixed bottom-0 left-0 w-full bg-white rounded-t-[20px] shadow-[0_-4px_24px_rgba(0,0,0,0.12)] z-[110] flex flex-col"
        style={{ height: '340px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 搜索栏 */}
        <div className="flex items-center px-4 py-3 gap-3 shrink-0">
          <div className="flex-1 bg-[#f5f5f5] rounded-[18px] flex items-center px-3 py-1.5">
            <Search size={16} className="text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="搜寻贴图"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="bg-transparent border-none outline-none text-[14px] w-full text-gray-700"
            />
          </div>
          <button
            onClick={e => { e.stopPropagation(); setShowImportModal(true); }}
            className="text-[#07C160] text-[14px] font-medium active:opacity-70 shrink-0"
          >
            导入
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              setManageMode(v => !v);
              setSelectedIds(new Set());
            }}
            className={`text-[14px] font-medium active:opacity-70 shrink-0 ${manageMode ? 'text-[#ee0a24]' : 'text-gray-800'}`}
          >
            {manageMode ? '完成' : '管理'}
          </button>
        </div>

        {/* 分组 Tab 栏 */}
        <div className="flex items-center px-3 border-b border-gray-100 shrink-0 overflow-x-auto no-scrollbar gap-1">
          {groups.map(g => (
            <button
              key={g.id}
              onDoubleClick={() => { setRenamingGroupId(g.id); setRenameText(g.name); }}
              className={`pb-2 px-3 text-[14px] font-medium whitespace-nowrap border-b-[2px] transition-colors shrink-0 ${
                activeGroupId === g.id && !searchText ? 'border-[#333] text-[#333]' : 'border-transparent text-gray-400'
              }`}
              onClick={e => { e.stopPropagation(); setActiveGroupId(g.id); setSearchText(''); }}
            >
              {g.name}
            </button>
          ))}
          <button
            className="pb-2 px-2 text-gray-400 shrink-0"
            onClick={e => { e.stopPropagation(); setShowAddGroupModal(true); }}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* 管理模式工具栏 */}
        {manageMode && (
          <div className="flex items-center justify-between px-4 py-2 bg-[#fafafa] border-b border-gray-100 shrink-0">
            <button
              onClick={e => {
                e.stopPropagation();
                if (selectedIds.size === filteredStickers.length) {
                  setSelectedIds(new Set());
                } else {
                  setSelectedIds(new Set(filteredStickers.map(s => s.id)));
                }
              }}
              className="text-[13px] text-gray-600 active:opacity-70"
            >
              {selectedIds.size === filteredStickers.length && filteredStickers.length > 0 ? '取消全选' : '全选'}
            </button>
            <div className="flex items-center gap-3">
              {!searchText && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    if (window.confirm(`确认删除分组「${activeGroup?.name}」及其所有表情包？`)) {
                      handleDeleteGroup(activeGroupId);
                    }
                  }}
                  className="text-[13px] text-[#ee0a24] active:opacity-70"
                >
                  删除分组
                </button>
              )}
              <button
                onClick={e => { e.stopPropagation(); handleDeleteSelected(); }}
                disabled={selectedIds.size === 0}
                className={`flex items-center gap-1 text-[13px] ${selectedIds.size > 0 ? 'text-[#ee0a24] active:opacity-70' : 'text-gray-300'}`}
              >
                <Trash2 size={14} />
                <span>删除({selectedIds.size})</span>
              </button>
            </div>
          </div>
        )}

        {/* 贴图网格 */}
        <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
          <div className="flex flex-wrap gap-2">
            {/* 上传按钮（非管理模式） */}
            {!manageMode && !searchText && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); handleUploadClick(); }}
                  className="w-[60px] h-[60px] flex flex-col items-center justify-center gap-1 bg-[#f5f5f5] rounded-[12px] active:bg-gray-200 transition-colors shrink-0"
                >
                  <Plus size={16} className="text-gray-400" />
                  <span className="text-[10px] text-gray-400">上传</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </>
            )}

            {/* 贴图列表 */}
            {filteredStickers.map(item => (
              <button
                key={item.id}
                className="relative flex flex-col items-center active:scale-95 transition-transform cursor-pointer shrink-0"
                style={{ width: '60px' }}
                onClick={e => {
                  e.stopPropagation();
                  if (manageMode) {
                    setSelectedIds(prev => {
                      const next = new Set(prev);
                      next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                      return next;
                    });
                  } else {
                    onSendSticker(item.url, item.label);
                    onClose();
                  }
                }}
              >
                <div className={`w-[60px] h-[60px] bg-gray-50 rounded-[10px] overflow-hidden border-[2px] transition-colors ${manageMode && selectedIds.has(item.id) ? 'border-[#07C160]' : 'border-transparent'}`}>
                  <img
                    src={item.url}
                    alt={item.label || `sticker`}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                  />
                </div>
                {manageMode && selectedIds.has(item.id) && (
                  <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#07C160] rounded-full flex items-center justify-center">
                    <Check size={10} className="text-white" strokeWidth={3} />
                  </div>
                )}
                {item.label && !manageMode && (
                  <span className="text-[10px] text-gray-500 mt-0.5 w-full text-center truncate px-1 leading-tight">
                    {item.label}
                  </span>
                )}
              </button>
            ))}

            {filteredStickers.length === 0 && !manageMode && !searchText && (
              <div className="w-full flex items-center justify-center text-[13px] text-gray-400 py-6">
                点击上传添加第一个表情包
              </div>
            )}
            {searchText && filteredStickers.length === 0 && (
              <div className="w-full flex items-center justify-center text-[13px] text-gray-400 py-6">
                没有找到相关表情包
              </div>
            )}
          </div>
        </div>

        {/* 底部 Tab */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-[#fbfbfb] shrink-0">
          <button className="flex-1 py-3 flex flex-col items-center justify-center gap-1 active:bg-gray-100 transition-colors">
            <Sticker size={20} className="text-[#333]" />
            <span className="text-[10px] text-[#333] font-medium">贴图</span>
          </button>
          <button className="flex-1 py-3 flex flex-col items-center justify-center gap-1 active:bg-gray-100 transition-colors">
            <Heart size={20} className="text-gray-400" />
            <span className="text-[10px] text-gray-400 font-medium">藏文字</span>
          </button>
        </div>
      </motion.div>

      {/* 新增分组弹窗 */}
      <AnimatePresence>
        {showAddGroupModal && (
          <>
            <div className="fixed inset-0 bg-black/40 z-[130]" onClick={() => setShowAddGroupModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
              animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
              exit={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
              className="fixed top-1/2 left-1/2 w-[78%] bg-white rounded-[14px] z-[140] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 pb-4">
                <div className="text-[17px] font-medium text-gray-900 mb-4">新建分组</div>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddGroup(); }}
                  placeholder="请输入分组名称"
                  className="w-full h-10 px-0 border-b border-[#07C160] text-[16px] focus:outline-none"
                  autoFocus
                />
              </div>
              <div className="flex border-t border-gray-100">
                <button onClick={() => setShowAddGroupModal(false)} className="flex-1 py-3 text-[16px] font-medium text-gray-900 active:bg-gray-50 border-r border-gray-100">取消</button>
                <button onClick={handleAddGroup} className="flex-1 py-3 text-[16px] font-medium text-[#07C160] active:bg-gray-50">创建</button>
              </div>
            </motion.div>
          </>
        )}

        {/* 重命名分组弹窗 */}
        {renamingGroupId && (
          <>
            <div className="fixed inset-0 bg-black/40 z-[130]" onClick={() => setRenamingGroupId(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
              animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
              exit={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
              className="fixed top-1/2 left-1/2 w-[78%] bg-white rounded-[14px] z-[140] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 pb-4">
                <div className="text-[17px] font-medium text-gray-900 mb-4">重命名分组</div>
                <input
                  type="text"
                  value={renameText}
                  onChange={e => setRenameText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRenameGroup(); }}
                  className="w-full h-10 px-0 border-b border-[#07C160] text-[16px] focus:outline-none"
                  autoFocus
                />
              </div>
              <div className="flex border-t border-gray-100">
                <button onClick={() => setRenamingGroupId(null)} className="flex-1 py-3 text-[16px] font-medium text-gray-900 active:bg-gray-50 border-r border-gray-100">取消</button>
                <button onClick={handleRenameGroup} className="flex-1 py-3 text-[16px] font-medium text-[#07C160] active:bg-gray-50">确定</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 批量导入弹窗 */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="fixed inset-0 bg-white z-[120] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <button onClick={() => setShowImportModal(false)} className="text-[16px] text-gray-800">取消</button>
              <span className="absolute left-1/2 -translate-x-1/2 text-[17px] font-medium text-gray-900">批量导入</span>
              <div className="w-8" />
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="text-[13px] text-gray-400 mb-4">正在导入至：<span className="text-gray-600 font-medium">{activeGroup?.name}</span></div>

              <div className="mb-8">
                <h3 className="text-[16px] font-medium text-gray-900 mb-1">方式一：文字输入</h3>
                <p className="text-[13px] text-gray-500 mb-3">格式：表情包标签: 图片网址（每行一个）</p>
                <textarea
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  placeholder={'开心: https://example.com/happy.png\n生气: https://example.com/angry.png'}
                  className="w-full h-[160px] bg-[#f9f9f9] border border-gray-200 rounded-[12px] p-3 text-[14px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-gray-300 resize-none font-mono"
                />
                <button
                  onClick={handleImportText}
                  className="w-full mt-4 bg-black text-white rounded-[10px] py-3.5 text-[16px] font-medium active:bg-gray-900 transition-colors"
                >
                  导入文字
                </button>
              </div>

              <div className="w-full h-px bg-gray-100 mb-8" />

              <div>
                <h3 className="text-[16px] font-medium text-gray-900 mb-1">方式二：文件导入</h3>
                <p className="text-[13px] text-gray-500 mb-4">支持 json、txt 文件</p>
                <button
                  onClick={() => importFileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-[10px] py-3.5 text-[15px] text-gray-800 active:bg-gray-50 transition-colors"
                >
                  <FileText size={18} />
                  <span>选择文件导入</span>
                </button>
                <input
                  type="file"
                  ref={importFileInputRef}
                  accept=".json,.txt,.docx"
                  className="hidden"
                  onChange={handleImportFile}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StickerPanel;
