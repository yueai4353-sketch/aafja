import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, FileText, Eye, Bot, User as UserIcon, Trash2, RefreshCw, Edit2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { generateAssetsWithAI } from '../utils/assetGeneration';
import { generateHouseStructure, HouseStructure } from '../utils/houseGeneration';

const DetailCard = ({ type, title, onClick, expandable, expandedText, onEdit, items, renderItem, onDeleteItem }: { type: 'white' | 'black', title: string, onClick?: () => void, expandable?: boolean, expandedText?: string, onEdit?: () => void, items?: any[], renderItem?: (item: any) => React.ReactNode, onDeleteItem?: (item: any) => void }) => {
  const isWhite = type === 'white';
  const [expanded, setExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClick = () => {
    if (expandable) {
      if (expanded && isDeleting) {
        setIsDeleting(false);
      }
      setExpanded(!expanded);
    }
    if (onClick) {
      onClick();
    }
  };

  const hasItems = items && items.length > 0;
  // 动态计算高度，根据项目数量决定展开后的高度
  const expandedHeight = hasItems ? Math.min(110 + items.length * 100, 350) : 200;

  // 使用毛玻璃效果以适应星空背景
  return (
    <div 
      className={`relative w-full rounded-[24px] overflow-hidden group cursor-pointer transition-all duration-300 ease-in-out hover:scale-[1.02]`}
      style={{ height: expanded ? `${expandedHeight}px` : '110px' }}
      onClick={handleClick}
    >
      {/* 毛玻璃背景层 */}
      <div className={`absolute inset-0 backdrop-blur-xl border ${
        isWhite 
          ? 'bg-white/10 border-white/20' 
          : 'bg-black/40 border-white/10'
      }`} />
      
      {/* 内容层 */}
      <div className={`absolute inset-[6px] rounded-[18px] border ${
        isWhite 
          ? 'border-white/30 bg-gradient-to-br from-white/20 to-white/5' 
          : 'border-white/5 bg-gradient-to-br from-white/10 to-transparent'
      } flex flex-col`}>
        {/* 高光效果 */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        <div className="h-[98px] flex-shrink-0 relative">
          <div className="absolute bottom-4 left-5 flex items-center">
            <span className={`text-[15px] font-medium tracking-widest ${
              isWhite ? 'text-white' : 'text-white/80'
            }`}>
              {title}
            </span>
            <div className={`ml-3 h-[1px] w-12 ${
              isWhite ? 'bg-white/50' : 'bg-white/20'
            }`} />
          </div>

          {/* 编辑和删除按钮，仅在展开时显示，位于右上方 */}
          {expandable && (
            <div className={`absolute top-3 right-4 flex items-center gap-2 transition-opacity duration-300 ${expanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
              <button 
                className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors" 
                onClick={(e) => { e.stopPropagation(); if (onEdit) onEdit(); }}
              >
                <Edit2 size={14} className="text-white/60" />
              </button>
              <button 
                className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center transition-colors ${isDeleting ? 'bg-red-500/20' : 'bg-white/5 hover:bg-white/10'}`} 
                onClick={(e) => { e.stopPropagation(); setIsDeleting(!isDeleting); }}
              >
                <Trash2 size={14} className={isDeleting ? 'text-red-400' : 'text-white/60'} />
              </button>
            </div>
          )}
        </div>

        {/* 展开内容 */}
        {expandable && (
          <div className={`overflow-hidden transition-all duration-300 ease-in-out flex flex-col ${expanded ? 'opacity-100 flex-1' : 'opacity-0 h-0'}`}>
             {!hasItems ? (
               <div className="flex-1 flex items-center justify-center pb-4">
                 <span className="text-[14px] text-gray-400 font-medium tracking-widest">— {expandedText} —</span>
               </div>
             ) : (
               <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3 custom-scrollbar" onClick={(e) => e.stopPropagation()}>
                 {items.map((item, idx) => (
                   <div key={idx} className="relative group/item">
                     <div className={`transition-opacity duration-300 ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
                       {renderItem && renderItem(item)}
                     </div>
                     {isDeleting && (
                       <motion.button 
                         initial={{ opacity: 0, scale: 0.8 }}
                         animate={{ opacity: 1, scale: 1 }}
                         className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg z-20"
                         onClick={(e) => { e.stopPropagation(); if (onDeleteItem) onDeleteItem(item); }}
                       >
                         <Trash2 size={18} />
                       </motion.button>
                     )}
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

import { AppDB } from '../db';

export const CangxuApp = ({
  onClose,
  personas = [],
  myProfile
}: {
  onClose: () => void;
  personas?: any[];
  myProfile?: any;
}) => {

  const [selectedPersona, setSelectedPersona] = useState<any>(() => {
    const savedId = localStorage.getItem('cangxu_selected_persona');
    if (savedId) {
      const found = personas.find(p => p.id === savedId);
      if (found) return found;
    }
    return null;
  });
  const [view, setView] = useState<'main' | 'list' | 'private_property' | 'residence' | 'house_detail'>('main');
  const [selectedHouse, setSelectedHouse] = useState<any>(null);
  const [residentsModalOpen, setResidentsModalOpen] = useState(false);
  const [selectedResidents, setSelectedResidents] = useState<string[]>([]); // 存储选中的住户ID

  // 加载住户数据
  useEffect(() => {
    if (selectedHouse) {
      const savedResidents = localStorage.getItem(`cangxu_house_residents_${selectedHouse.id}`);
      if (savedResidents) {
        setSelectedResidents(JSON.parse(savedResidents));
      } else {
        setSelectedResidents([]);
      }
    }
  }, [selectedHouse]);

  // 保存住户数据
  const handleSaveResidents = () => {
    if (selectedHouse) {
      localStorage.setItem(`cangxu_house_residents_${selectedHouse.id}`, JSON.stringify(selectedResidents));
      setResidentsModalOpen(false);
    }
  };

  useEffect(() => {
    if (selectedPersona) {
      localStorage.setItem('cangxu_selected_persona', selectedPersona.id);
    } else {
      localStorage.removeItem('cangxu_selected_persona');
    }
  }, [selectedPersona]);
  const [bgPosition, setBgPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [editModal, setEditModal] = useState<'bank' | 'property' | 'shares' | 'car' | null>(null);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  
  // 表单状态
  const [formData, setFormData] = useState<any>({});
  
  // 生成状态
  const [generateOptions, setGenerateOptions] = useState({
    prompt: '',
    bank: true,
    property: true,
    shares: true,
    car: true
  });
  
  // 资产列表状态
  const [banks, setBanks] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [shares, setShares] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  
  // 房屋结构状态
  const [houseStructure, setHouseStructure] = useState<HouseStructure | null>(null);
  const [isGeneratingHouse, setIsGeneratingHouse] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false); // 房屋生成弹窗
  const [generateDesignInput, setGenerateDesignInput] = useState(''); // 房屋设计输入
  const [currentRoom, setCurrentRoom] = useState<string>(''); // 当前所在房间
  const [expandedSpot, setExpandedSpot] = useState<number | null>(null); // 展开的翻找位置
  const [previewDirection, setPreviewDirection] = useState<'up' | 'down' | 'left' | 'right' | null>(null); // 当前预览的方向

  // 从 localStorage 加载数据
  useEffect(() => {
    if (selectedPersona) {
      const b = localStorage.getItem(`cangxu_banks_${selectedPersona.id}`);
      const p = localStorage.getItem(`cangxu_properties_${selectedPersona.id}`);
      const s = localStorage.getItem(`cangxu_shares_${selectedPersona.id}`);
      const c = localStorage.getItem(`cangxu_cars_${selectedPersona.id}`);
      
      setBanks(b ? JSON.parse(b) : []);
      setProperties(p ? JSON.parse(p) : []);
      setShares(s ? JSON.parse(s) : []);
      setCars(c ? JSON.parse(c) : []);
    }
  }, [selectedPersona]);

  // 加载房屋结构数据
  useEffect(() => {
    if (selectedHouse) {
      const savedStructure = localStorage.getItem(`cangxu_house_structure_${selectedHouse.id}`);
      if (savedStructure) {
        const structure = JSON.parse(savedStructure);
        setHouseStructure(structure);
        setCurrentRoom(structure.entry || ''); // 设置默认房间为入口
      } else {
        setHouseStructure(null);
        setCurrentRoom('');
      }
    }
  }, [selectedHouse]);

  // 生成房屋结构
  const handleGenerateHouse = async () => {
    if (!selectedHouse || !selectedPersona) {
      alert('请先选择房屋和角色');
      return;
    }

    setIsGeneratingHouse(true);
    setShowGenerateModal(false);
    try {
      console.log('[藏叙] 开始生成房屋结构, 设计思路:', generateDesignInput);
      
      // 获取选中的住户信息
      const residents = selectedResidents.map(id => {
        if (id === 'user') {
          // 优先使用真实姓名，其次微信昵称，最后默认名称
          const userName = myProfile?.real_name || myProfile?.name || '我自己';
          return { name: userName, id: 'user' };
        }
        const persona = personas.find(p => p.id === id);
        return persona ? { name: persona.name, id: persona.id } : null;
      }).filter((r): r is { name: string; id: string } => r !== null);

      const structure = await generateHouseStructure({
        persona: selectedPersona,
        residents: residents.map(r => r.id),
        designPrompt: generateDesignInput // 将设计输入传递给生成函数
      });

      console.log('[藏叙] 房屋结构生成完成:', structure);
      
      setHouseStructure(structure);
      localStorage.setItem(`cangxu_house_structure_${selectedHouse.id}`, JSON.stringify(structure));
      
      alert('✅ 房屋结构生成成功！');
    } catch (error: any) {
      console.error('[藏叙] 房屋结构生成失败:', error);
      alert(`❌ 生成失败: ${error.message || '未知错误'}`);
    } finally {
      setIsGeneratingHouse(false);
    }
  };

  // 保存数据
  const handleSave = () => {
    if (!selectedPersona) return;
    
    if (editModal === 'bank') {
      let newBanks;
      if (formData.id) {
        newBanks = banks.map(b => b.id === formData.id ? formData : b);
      } else {
        newBanks = [...banks, { id: Date.now(), ...formData }];
      }
      setBanks(newBanks);
      localStorage.setItem(`cangxu_banks_${selectedPersona.id}`, JSON.stringify(newBanks));
    } else if (editModal === 'property') {
      let newProps;
      if (formData.id) {
        newProps = properties.map(p => p.id === formData.id ? formData : p);
      } else {
        newProps = [...properties, { id: Date.now(), ...formData }];
      }
      setProperties(newProps);
      localStorage.setItem(`cangxu_properties_${selectedPersona.id}`, JSON.stringify(newProps));
    } else if (editModal === 'shares') {
      let newShares;
      if (formData.id) {
        newShares = shares.map(s => s.id === formData.id ? formData : s);
      } else {
        newShares = [...shares, { id: Date.now(), ...formData }];
      }
      setShares(newShares);
      localStorage.setItem(`cangxu_shares_${selectedPersona.id}`, JSON.stringify(newShares));
    } else if (editModal === 'car') {
      let newCars;
      if (formData.id) {
        newCars = cars.map(c => c.id === formData.id ? formData : c);
      } else {
        newCars = [...cars, { id: Date.now(), ...formData }];
      }
      setCars(newCars);
      localStorage.setItem(`cangxu_cars_${selectedPersona.id}`, JSON.stringify(newCars));
    }
    
    setEditModal(null);
    setFormData({});
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - lastPos.current.x;
    const deltaY = e.clientY - lastPos.current.y;
    
    setBgPosition(prev => ({
      x: prev.x + deltaX * 2.5,
      y: prev.y + deltaY * 2.5
    }));
    
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  // 生成随机星星
  const generateStars = (count: number) => {
    return Array.from({ length: count }).map((_, i) => {
      // 增加一定比例的大星星
      const isLargeStar = Math.random() > 0.85; // 15% 概率是大星星
      const baseSize = isLargeStar ? Math.random() * 3 + 2.5 : Math.random() * 2 + 0.5;

      return {
        id: i,
        x: Math.random() * 300 - 100, // -100% to 200% (to cover the 300% width/height background)
        y: Math.random() * 300 - 100, // -100% to 200%
        size: baseSize, 
        opacity: isLargeStar ? Math.random() * 0.4 + 0.6 : Math.random() * 0.6 + 0.2,
        twinkleSpeed: Math.random() * 4 + 1,
        twinkleDelay: Math.random() * 5
      };
    });
  };

  const [stars] = useState(() => generateStars(800)); // 将星星数量大幅增加到 800

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 bg-black z-50 flex flex-col overflow-hidden text-white font-sans touch-none select-none"
    >
      
      {/* 动态星空背景 */}
      <div 
        className="absolute inset-[-100%] w-[300%] h-[300%] transition-transform duration-300 ease-out pointer-events-none"
        style={{
          transform: `translate3d(${bgPosition.x}px, ${bgPosition.y}px, 0)`,
          background: '#040508' // 纯粹的深色星空底色，无渐变
        }}
      >
        {stars.map(star => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              boxShadow: `0 0 ${star.size * 2}px rgba(255,255,255,0.8)`,
              animation: `twinkle ${star.twinkleSpeed}s infinite ease-in-out ${star.twinkleDelay}s alternate`
            }}
          />
        ))}
      </div>

      {/* 遮罩层，用于捕获滑动事件 */}
      {view === 'main' && (
        <div 
          className="absolute inset-0 z-10"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      )}

      {view === 'list' && (
        <div className="relative z-20 flex-1 flex flex-col w-full h-full">
          {/* 新界面的顶部导航栏 */}
          <div className="flex items-center px-4 pt-12 pb-4 sticky top-0 bg-gradient-to-b from-black/80 to-transparent">
            <button 
              onClick={() => setView('main')} 
              className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <ChevronLeft size={20} className="text-white" />
            </button>
            
            <div className="flex-1 flex justify-center items-center gap-3 pr-10">
              <div className="w-8 h-8 rounded-full border border-white/20 bg-white/10 flex items-center justify-center overflow-hidden backdrop-blur-sm">
                {selectedPersona?.avatar ? (
                  <img src={selectedPersona.avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={16} className="text-white/50" />
                )}
              </div>
              <span className="font-medium text-lg text-white tracking-widest">{selectedPersona?.name || '未知角色'}</span>
            </div>
          </div>

          {/* 列表内容区 */}
          <div className="flex-1 px-5 pb-8 flex flex-col gap-4 overflow-y-auto pointer-events-auto mt-2">
            <DetailCard type="black" title="私人财产" onClick={() => setView('private_property')} />
            <DetailCard type="white" title="住宅" onClick={() => setView('residence')} />
          </div>
        </div>
      )}

      {view === 'residence' && (
        <div className="relative z-20 flex-1 flex flex-col w-full h-full">
          {/* 住宅界面的顶部导航栏 */}
          <div className="flex items-center justify-between px-4 pt-12 pb-4 sticky top-0 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto z-10">
            <button 
              onClick={() => setView('list')} 
              className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <ChevronLeft size={20} className="text-white" />
            </button>
            
            <div className="flex flex-col items-center justify-center">
              <span className="font-medium text-lg text-white tracking-widest mb-1">住宅</span>
              <span className="font-medium text-xs text-white/50 tracking-widest">{selectedPersona?.name || '未知角色'}</span>
            </div>

            <div className="w-10"></div> {/* 占位符以保持标题居中 */}
          </div>

          {/* 房产列表内容区 */}
          <div className="flex-1 px-5 pb-8 overflow-y-auto pointer-events-auto -mt-4 pt-4 custom-scrollbar">
            {properties.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center h-[50vh]">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/30"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <span className="text-[14px] text-white/40 tracking-widest">暂无房产记录</span>
                <button 
                  onClick={() => setView('private_property')}
                  className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-white/70 text-sm tracking-wider transition-colors"
                >
                  去添加房产
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {properties.map((prop, idx) => (
                  <div 
                    key={prop.id || idx} 
                    className="relative group rounded-3xl overflow-hidden cursor-pointer hover:-translate-y-1 transition-all duration-300"
                    onClick={() => {
                      setSelectedHouse(prop);
                      setView('house_detail');
                    }}
                  >
                    {/* 房产卡片背景 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/10 rounded-3xl"></div>
                    
                    {/* 房产插图/图标区 - 占位图 */}
                    <div className="h-40 w-full relative overflow-hidden bg-black/40">
                      {/* 随机使用不同的几何图形作为占位背景 */}
                      <div className="absolute inset-0 opacity-20">
                        {idx % 3 === 0 && (
                          <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500 rounded-full blur-3xl"></div>
                        )}
                        {idx % 3 === 1 && (
                          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-500 rounded-full blur-3xl"></div>
                        )}
                        {idx % 3 === 2 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                             <div className="w-full h-full bg-gradient-to-tr from-amber-500/20 to-orange-600/20"></div>
                          </div>
                        )}
                      </div>
                      
                      {/* 极简房产线条图 */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-30">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 10L12 3l9 7"/>
                          <path d="M4 10v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V10"/>
                          <path d="M9 22V12h6v10"/>
                        </svg>
                      </div>
                      
                      {/* 顶部标签 */}
                      <div className="absolute top-4 right-4 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                        <span className="text-white/80 text-[10px] tracking-widest">{prop.valuation ? `¥ ${prop.valuation}` : '未估值'}</span>
                      </div>
                    </div>
                    
                    {/* 信息区 */}
                    <div className="p-5 relative z-10">
                      <h3 className="text-white text-xl font-medium tracking-wide mb-2">{prop.name || '未命名房产'}</h3>
                      
                      <div className="flex flex-col gap-2 mt-4">
                        <div className="flex items-center text-white/60 text-sm">
                          <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center mr-3 border border-white/5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                          </div>
                          <span className="tracking-wide">{prop.location || '未知地点'}</span>
                        </div>
                        
                        <div className="flex items-center text-white/60 text-sm">
                          <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center mr-3 border border-white/5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                          </div>
                          <span className="tracking-wide">{prop.area || '0'} ㎡</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* 悬停光晕 */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'house_detail' && (
        <div className="relative z-20 flex-1 flex flex-col w-full h-full">
          {/* 房屋详情界面的顶部导航栏 */}
          <div className="flex items-center justify-between px-4 pt-12 pb-4 sticky top-0 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto z-10">
            <button 
              onClick={() => {
                setView('residence');
                setSelectedHouse(null);
              }} 
              className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors shrink-0"
            >
              <ChevronLeft size={20} className="text-white" />
            </button>

            {/* 左侧住户选择 */}
            <div className="flex-1 ml-4 relative">
              <button 
                className="h-10 px-3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                onClick={() => setResidentsModalOpen(true)}
              >
                <div className="relative">
                  <UserIcon size={16} className="text-white/80" />
                  {selectedResidents.length > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-[#e87a90] rounded-full border-2 border-black flex items-center justify-center">
                      <span className="text-[8px] text-white font-bold leading-none">{selectedResidents.length}</span>
                    </div>
                  )}
                </div>
                <span className="text-xs text-white/80 tracking-widest hidden sm:inline-block">住户</span>
              </button>
            </div>
            
            {/* 标题 */}
            <div className="flex flex-col items-center justify-center absolute left-1/2 -translate-x-1/2">
              <span className="font-medium text-lg text-white tracking-widest mb-1 truncate max-w-[150px]">{selectedHouse?.name || '房屋详情'}</span>
            </div>

            {/* 右侧按钮组 */}
            <div className="flex items-center gap-2 shrink-0">
              <button 
                className="w-10 h-10 bg-white/5 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                onClick={() => {
                  if (window.confirm('确定要删除此房屋的结构数据吗？此操作不可恢复。')) {
                    if (selectedHouse) {
                      localStorage.removeItem(`cangxu_house_structure_${selectedHouse.id}`);
                      setHouseStructure(null);
                      setCurrentRoom('');
                      alert('✅ 房屋结构已删除');
                    }
                  }
                }}
              >
                <Trash2 size={18} className="text-white/80" strokeWidth={1.5} />
              </button>
              <button 
                className={`w-10 h-10 bg-white/5 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors ${isGeneratingHouse ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => setShowGenerateModal(true)}
                disabled={isGeneratingHouse}
              >
                <RefreshCw size={18} className={`text-white/80 ${isGeneratingHouse ? 'animate-spin' : ''}`} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* 房屋详情内容区 */}
          <div className="flex-1 flex flex-col items-center pointer-events-auto overflow-hidden">
            {!houseStructure ? (
              <div className="flex-1 flex items-center justify-center">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-white/30 text-lg tracking-[0.3em] font-light flex items-center"
                >
                  <span className="mr-4 opacity-50">—</span>
                  请生成房屋结构
                  <span className="ml-4 opacity-50">—</span>
                </motion.div>
              </div>
            ) : currentRoom && houseStructure.rooms[currentRoom] ? (
              <>
                {/* 房屋地图视图 */}
                <div className="flex-1 w-full relative flex flex-col pt-2 sm:pt-6 h-full">
                  
                  {/* 向上导航按钮 (如果存在) */}
                  <div className="w-full flex justify-center h-10 shrink-0 relative mt-2">
                    {(houseStructure.rooms[currentRoom].exits?.['up'] || houseStructure.rooms[currentRoom].exits?.['上']) ? (
                      <div className="flex flex-col items-center">
                        <button
                          className={`px-3 sm:px-4 py-1.5 bg-transparent border rounded-lg text-[11px] sm:text-xs tracking-widest transition-all flex items-center gap-1.5 shadow-lg ${previewDirection === 'up' ? 'border-[#e87a90] text-[#e87a90] bg-[#e87a90]/10' : 'border-white/20 text-white/70 hover:bg-white/5'}`}
                          onClick={() => {
                            if (previewDirection === 'up') {
                              const exits = houseStructure.rooms[currentRoom].exits;
                              setCurrentRoom(exits['up'] || exits['上']);
                              setExpandedSpot(null);
                              setPreviewDirection(null);
                            } else {
                              setPreviewDirection('up');
                            }
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-90">
                            <polyline points="15 18 9 12 15 6"></polyline>
                          </svg>
                          <span>{previewDirection === 'up' ? (houseStructure.rooms[currentRoom].exits['up'] || houseStructure.rooms[currentRoom].exits['上']) : ''}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="h-10"></div> // 占位保持布局稳定
                    )}
                  </div>

                  {/* 中间内容区 (包含左右按钮) */}
                  <div className="flex-1 w-full flex items-center relative min-h-0 my-1 sm:my-2">
                    
                    {/* 居中的内容区 - 可滚动 */}
                    <div className="flex-1 h-full overflow-y-auto px-4 sm:px-10 custom-scrollbar flex flex-col items-center py-1 sm:py-2">
                      <motion.div
                        key={currentRoom}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center w-full max-w-[90%] sm:max-w-sm h-full justify-center"
                      >
                        <div className="flex flex-col items-center w-full my-auto">
                          {/* 房间名称 */}
                          <h2 className="text-lg sm:text-xl text-white font-medium tracking-widest mb-4">{currentRoom}</h2>
                          
                          {/* 房间描述 */}
                          <p className="text-white/80 text-[11px] sm:text-xs leading-loose text-center mb-6 px-2 tracking-wide font-light w-full max-w-[95%]">
                            {houseStructure.rooms[currentRoom].decor}
                          </p>

                          {/* 左右导航按钮集成在内容区中间层 */}
                          <div className="w-full relative flex items-center justify-center mb-6">
                            {/* 向左导航按钮 */}
                            <div className="absolute left-0 z-10 flex items-center">
                              {(houseStructure.rooms[currentRoom].exits?.['left'] || houseStructure.rooms[currentRoom].exits?.['左']) && (
                                <button 
                                  className={`px-3 py-1.5 rounded-lg bg-transparent border flex items-center justify-center transition-colors shadow-lg ${previewDirection === 'left' ? 'border-[#e87a90] text-[#e87a90] bg-[#e87a90]/10' : 'w-8 h-8 border-white/20 text-white/70 hover:bg-white/10'}`}
                                  onClick={() => {
                                    if (previewDirection === 'left') {
                                      const exits = houseStructure.rooms[currentRoom].exits;
                                      setCurrentRoom(exits['left'] || exits['左']);
                                      setExpandedSpot(null);
                                      setPreviewDirection(null);
                                    } else {
                                      setPreviewDirection('left');
                                    }
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                                  {previewDirection === 'left' && <span className="ml-1.5 text-[11px] sm:text-xs tracking-widest">{houseStructure.rooms[currentRoom].exits['left'] || houseStructure.rooms[currentRoom].exits['左']}</span>}
                                </button>
                              )}
                            </div>

                            {/* 可见物品 */}
                            {houseStructure.rooms[currentRoom].items && houseStructure.rooms[currentRoom].items.length > 0 && (
                              <div className="w-full flex flex-col items-center gap-2">
                                {houseStructure.rooms[currentRoom].items.map((item, idx) => (
                                  <div key={idx} className="text-[#a0a5ba] text-[11px] sm:text-[12px] tracking-widest font-light text-center w-full px-10">
                                    {item}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* 向右导航按钮 */}
                            <div className="absolute right-0 z-10 flex items-center">
                              {(houseStructure.rooms[currentRoom].exits?.['right'] || houseStructure.rooms[currentRoom].exits?.['右']) && (
                                <button 
                                  className={`px-3 py-1.5 rounded-lg bg-transparent border flex items-center justify-center transition-colors shadow-lg ${previewDirection === 'right' ? 'border-[#e87a90] text-[#e87a90] bg-[#e87a90]/10' : 'w-8 h-8 border-white/20 text-white/70 hover:bg-white/10'}`}
                                  onClick={() => {
                                    if (previewDirection === 'right') {
                                      const exits = houseStructure.rooms[currentRoom].exits;
                                      setCurrentRoom(exits['right'] || exits['右']);
                                      setExpandedSpot(null);
                                      setPreviewDirection(null);
                                    } else {
                                      setPreviewDirection('right');
                                    }
                                  }}
                                >
                                  {previewDirection === 'right' && <span className="mr-1.5 text-[11px] sm:text-xs tracking-widest">{houseStructure.rooms[currentRoom].exits['right'] || houseStructure.rooms[currentRoom].exits['右']}</span>}
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 翻找区域 */}
                          {houseStructure.rooms[currentRoom].spots && houseStructure.rooms[currentRoom].spots.length > 0 && (
                            <div className="w-full flex flex-col items-center mt-4">
                              <h3 className="text-[#7d8299] text-[10px] sm:text-[11px] tracking-[0.3em] text-center mb-3">翻找</h3>
                              <div className="flex flex-col items-center gap-2 w-full">
                                {houseStructure.rooms[currentRoom].spots.map((spot, idx) => (
                                  <React.Fragment key={idx}>
                                    <button
                                      className={`w-auto min-w-[140px] max-w-[240px] bg-transparent border ${expandedSpot === idx ? 'border-white/40' : 'border-white/10 border-dashed'} rounded-[6px] text-center px-3 py-1.5 hover:bg-white/5 transition-all`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedSpot(expandedSpot === idx ? null : idx);
                                      }}
                                    >
                                      <div className="text-[#c0c5d6] text-[11px] font-normal tracking-widest truncate">{spot.where}</div>
                                    </button>
                                    
                                    {/* 展开的物品列表放在按钮正下方 */}
                                    {expandedSpot === idx && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="w-full max-w-[240px] px-2 py-1 bg-transparent flex justify-center mx-auto"
                                      >
                                        <div className="text-[#a0a5ba] text-[10px] sm:text-[11px] leading-relaxed text-center font-light tracking-wide">{spot.what}</div>
                                      </motion.div>
                                    )}
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  {/* 向下导航按钮 (如果存在) */}
                  <div className="w-full flex justify-center h-12 shrink-0 pt-1 pb-4 relative mb-2">
                    {(houseStructure.rooms[currentRoom].exits?.['down'] || houseStructure.rooms[currentRoom].exits?.['下']) && (
                      <div className="flex flex-col items-center">
                        <button
                          className={`px-3 sm:px-4 py-1.5 bg-transparent border rounded-lg text-[11px] sm:text-xs tracking-widest transition-all flex items-center gap-1.5 shadow-lg ${previewDirection === 'down' ? 'border-[#e87a90] text-[#e87a90] bg-[#e87a90]/10' : 'border-white/20 text-white/70 hover:bg-white/5'}`}
                          onClick={() => {
                            if (previewDirection === 'down') {
                              const exits = houseStructure.rooms[currentRoom].exits;
                              setCurrentRoom(exits['down'] || exits['下']);
                              setExpandedSpot(null);
                              setPreviewDirection(null);
                            } else {
                              setPreviewDirection('down');
                            }
                          }}
                        >
                          <span>{previewDirection === 'down' ? (houseStructure.rooms[currentRoom].exits['down'] || houseStructure.rooms[currentRoom].exits['下']) : ''}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="-rotate-90">
                            <polyline points="15 18 9 12 15 6"></polyline>
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {view === 'private_property' && (
        <div className="relative z-20 flex-1 flex flex-col w-full h-full">
          {/* 私人财产详情界面的顶部导航栏 */}
          <div className="flex items-center justify-between px-4 pt-12 pb-4 sticky top-0 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
            <button 
              onClick={() => setView('list')} 
              className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <ChevronLeft size={20} className="text-white" />
            </button>
            
            <div className="flex flex-col items-center justify-center">
              <div className="w-8 h-8 rounded-full border border-white/20 bg-white/10 flex items-center justify-center overflow-hidden backdrop-blur-sm mb-1">
                {selectedPersona?.avatar ? (
                  <img src={selectedPersona.avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={16} className="text-white/50" />
                )}
              </div>
              <span className="font-medium text-sm text-white tracking-widest">{selectedPersona?.name || '未知角色'}</span>
            </div>

            <div className="flex items-center gap-2">
              <button className="w-10 h-10 bg-white/5 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                <Trash2 size={18} className="text-white/80" strokeWidth={1.5} />
              </button>
              <button 
                className="w-10 h-10 bg-white/5 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                onClick={() => setGenerateModalOpen(true)}
              >
                <RefreshCw size={18} className="text-white/80" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* 列表内容区 */}
          <div className="flex-1 px-5 pb-8 flex flex-col gap-4 overflow-y-auto pointer-events-auto mt-2">
            <DetailCard 
              type="white" 
              title="银行卡" 
              expandable={true} 
              expandedText="请添加银行卡" 
              onEdit={() => { setFormData({}); setEditModal('bank'); }}
              items={banks}
              onDeleteItem={(bank) => {
                if (!selectedPersona) return;
                const newBanks = banks.filter(b => b.id !== bank.id);
                setBanks(newBanks);
                localStorage.setItem(`cangxu_banks_${selectedPersona.id}`, JSON.stringify(newBanks));
              }}
              renderItem={(bank) => (
                <div 
                  className="w-full bg-gradient-to-r from-gray-800 to-gray-900 border border-white/10 rounded-2xl p-4 shadow-lg overflow-hidden relative cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={(e) => { e.stopPropagation(); setFormData(bank); setEditModal('bank'); }}
                >
                  {/* 卡片反光 */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                      <div className="text-white/50 text-[10px] tracking-widest mb-1">{bank.bankName || '未知银行'}</div>
                      <div className="text-white font-medium tracking-widest">{bank.cardType || '普通卡'}</div>
                    </div>
                    {/* 芯片图标占位 */}
                    <div className="w-8 h-6 rounded bg-gradient-to-br from-yellow-400/80 to-yellow-600/80 opacity-80 border border-yellow-200/30 flex items-center justify-center">
                      <div className="w-6 h-[1px] bg-black/20"></div>
                    </div>
                  </div>
                  
                  <div className="text-white/80 font-mono tracking-[0.2em] text-sm mb-4 relative z-10">
                    {bank.cardNumber || '**** **** **** ****'}
                  </div>
                  
                  <div className="flex justify-between items-end relative z-10">
                    <div>
                      <div className="text-white/40 text-[9px] tracking-widest mb-0.5">CURRENT BALANCE</div>
                      <div className="text-white tracking-wider font-semibold">¥ {bank.balance || '0.00'}</div>
                    </div>
                    <div className="text-white/20 font-bold italic tracking-tighter text-xl">VISA</div>
                  </div>
                </div>
              )}
            />
            <DetailCard 
              type="black" 
              title="房产" 
              expandable={true} 
              expandedText="请添加房产" 
              onEdit={() => { setFormData({}); setEditModal('property'); }}
              items={properties}
              onDeleteItem={(prop) => {
                if (!selectedPersona) return;
                const newProps = properties.filter(p => p.id !== prop.id);
                setProperties(newProps);
                localStorage.setItem(`cangxu_properties_${selectedPersona.id}`, JSON.stringify(newProps));
              }}
              renderItem={(prop) => (
                <div 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4 cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={(e) => { e.stopPropagation(); setFormData(prop); setEditModal('property'); }}
                >
                  <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/5">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/50"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-[15px] truncate mb-1">{prop.name || '未命名房产'}</h3>
                    <div className="flex items-center text-white/50 text-[11px] mb-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span className="truncate">{prop.location || '未知地点'}</span>
                      <span className="mx-2">•</span>
                      <span>{prop.area || '0'} ㎡</span>
                    </div>
                    <div className="text-[#e87a90] text-sm tracking-wider font-semibold">¥ {prop.valuation || '0'}</div>
                  </div>
                </div>
              )}
            />
            <DetailCard 
              type="white" 
              title="股份" 
              expandable={true} 
              expandedText="请添加股份" 
              onEdit={() => { setFormData({}); setEditModal('shares'); }}
              items={shares}
              onDeleteItem={(share) => {
                if (!selectedPersona) return;
                const newShares = shares.filter(s => s.id !== share.id);
                setShares(newShares);
                localStorage.setItem(`cangxu_shares_${selectedPersona.id}`, JSON.stringify(newShares));
              }}
              renderItem={(share) => (
                <div 
                  className="w-full bg-gradient-to-br from-white/10 to-transparent border border-white/10 rounded-2xl p-4 relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={(e) => { e.stopPropagation(); setFormData(share); setEditModal('shares'); }}
                >
                  <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white/5 to-transparent skew-x-[-15deg] transform translate-x-4"></div>
                  
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                        <span className="text-white font-bold text-xs">{(share.company || '公').charAt(0)}</span>
                      </div>
                      <h3 className="text-white font-medium text-[15px] tracking-wider">{share.company || '未知公司'}</h3>
                    </div>
                    <div className="px-2.5 py-1 rounded bg-white/10 border border-white/10 text-white/80 text-[10px] tracking-widest">
                      {share.type || '普通股'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4 relative z-10">
                    <div>
                      <div className="text-white/50 text-[10px] mb-1 tracking-widest">持股比例</div>
                      <div className="text-white text-lg font-mono">{share.ratio || '0'}%</div>
                    </div>
                    <div>
                      <div className="text-white/50 text-[10px] mb-1 tracking-widest">市值估值</div>
                      <div className="text-white text-lg tracking-wider font-semibold">¥ {share.valuation || '0'}</div>
                    </div>
                  </div>
                </div>
              )}
            />
            <DetailCard 
              type="black" 
              title="车产" 
              expandable={true} 
              expandedText="请添加车辆" 
              onEdit={() => { setFormData({}); setEditModal('car'); }}
              items={cars}
              onDeleteItem={(car) => {
                if (!selectedPersona) return;
                const newCars = cars.filter(c => c.id !== car.id);
                setCars(newCars);
                localStorage.setItem(`cangxu_cars_${selectedPersona.id}`, JSON.stringify(newCars));
              }}
              renderItem={(car) => (
                <div 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4 cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={(e) => { e.stopPropagation(); setFormData(car); setEditModal('car'); }}
                >
                  <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/5">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
                      <rect x="3" y="10" width="18" height="10" rx="2" ry="2"/>
                      <path d="M5 10l2-4h10l2 4"/>
                      <circle cx="7" cy="20" r="2"/>
                      <circle cx="17" cy="20" r="2"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-white font-medium text-[15px] truncate">{car.brand || '未知品牌'} {car.model || ''}</h3>
                    </div>
                    <div className="flex items-center text-white/50 text-[11px] mb-2">
                      <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10 tracking-widest">{car.plate || '未上牌'}</span>
                    </div>
                    <div className="text-[#e87a90] text-sm tracking-wider font-semibold">¥ {car.valuation || '0'}</div>
                  </div>
                </div>
              )}
            />
          </div>
        </div>
      )}

      {/* 生成弹窗 */}
      {generateModalOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-sm bg-white/10 border border-white/20 rounded-[28px] overflow-hidden backdrop-blur-xl shadow-2xl">
            <div className="relative flex items-center justify-center p-5 border-b border-white/10">
              <h2 className="text-white font-medium tracking-wider">AI 生成资产</h2>
              <button 
                onClick={() => setGenerateModalOpen(false)}
                className="absolute right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X size={18} className="text-white/60" />
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-5">
              <div>
                <label className="block text-xs text-white/50 mb-2 ml-1">生成要求</label>
                <textarea 
                  value={generateOptions.prompt}
                  onChange={(e) => setGenerateOptions({...generateOptions, prompt: e.target.value})}
                  placeholder="不写则随机生成。可输入：香港顶级富豪、低调隐形富豪等..." 
                  className="w-full h-24 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors resize-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-3 ml-1">生成类型</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'bank', label: '银行卡' },
                    { id: 'property', label: '房产' },
                    { id: 'shares', label: '股份' },
                    { id: 'car', label: '车产' }
                  ].map(item => (
                    <label key={item.id} className="flex items-center gap-3 bg-black/20 p-3 rounded-xl border border-white/5 cursor-pointer hover:bg-black/30 transition-colors">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          className="peer sr-only"
                          checked={generateOptions[item.id as keyof typeof generateOptions] as boolean}
                          onChange={(e) => setGenerateOptions({...generateOptions, [item.id]: e.target.checked})}
                        />
                        <div className="w-5 h-5 rounded border border-white/30 peer-checked:bg-white peer-checked:border-white transition-colors flex items-center justify-center">
                          <svg className={`w-3.5 h-3.5 text-black transition-opacity ${generateOptions[item.id as keyof typeof generateOptions] ? 'opacity-100' : 'opacity-0'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                      </div>
                      <span className="text-sm text-white/90">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button 
                  className="flex-1 py-3.5 bg-white/10 border border-white/10 text-white font-medium tracking-widest rounded-xl hover:bg-white/20 transition-colors"
                  onClick={() => setGenerateModalOpen(false)}
                >
                  取消
                </button>
                <button 
                  className="flex-1 py-3.5 bg-white text-black font-medium tracking-widest rounded-xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={async () => {
                    if (!selectedPersona) {
                      alert('请先选择角色');
                      return;
                    }
                    
                    // 检查是否至少选择了一个生成类型
                    if (!generateOptions.bank && !generateOptions.property && !generateOptions.shares && !generateOptions.car) {
                      alert('请至少选择一个资产类型');
                      return;
                    }
                    
                    try {
                      // 显示加载状态
                      const button = document.activeElement as HTMLButtonElement;
                      if (button) {
                        button.disabled = true;
                        button.innerHTML = '<div class="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div> 生成中...';
                      }
                      
                      console.log('[藏叙] 开始AI生成资产，选项:', generateOptions);
                      
                      // 调用 AI 生成
                      const result = await generateAssetsWithAI({
                        persona: selectedPersona,
                        generateOptions: generateOptions
                      });
                      
                      console.log('[藏叙] AI生成完成:', result);
                      
                      // 将生成的资产添加到现有资产中
                      if (result.banks.length > 0) {
                        const newBanks = [...banks, ...result.banks];
                        setBanks(newBanks);
                        localStorage.setItem(`cangxu_banks_${selectedPersona.id}`, JSON.stringify(newBanks));
                      }
                      
                      if (result.properties.length > 0) {
                        const newProperties = [...properties, ...result.properties];
                        setProperties(newProperties);
                        localStorage.setItem(`cangxu_properties_${selectedPersona.id}`, JSON.stringify(newProperties));
                      }
                      
                      if (result.shares.length > 0) {
                        const newShares = [...shares, ...result.shares];
                        setShares(newShares);
                        localStorage.setItem(`cangxu_shares_${selectedPersona.id}`, JSON.stringify(newShares));
                      }
                      
                      if (result.cars.length > 0) {
                        const newCars = [...cars, ...result.cars];
                        setCars(newCars);
                        localStorage.setItem(`cangxu_cars_${selectedPersona.id}`, JSON.stringify(newCars));
                      }
                      
                      // 显示成功提示
                      const totalGenerated = result.banks.length + result.properties.length + result.shares.length + result.cars.length;
                      alert(`✅ 成功生成 ${totalGenerated} 条资产记录`);
                      
                      setGenerateModalOpen(false);
                      
                      // 重置生成选项
                      setGenerateOptions({
                        prompt: '',
                        bank: true,
                        property: true,
                        shares: true,
                        car: true,
                      });
                      
                    } catch (error: any) {
                      console.error('[藏叙] AI生成失败:', error);
                      alert(`❌ 生成失败: ${error.message || '未知错误'}`);
                      
                      // 恢复按钮状态
                      const button = document.activeElement as HTMLButtonElement;
                      if (button) {
                        button.disabled = false;
                        button.innerHTML = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg> 开始生成';
                      }
                    }
                  }}
                  disabled={!selectedPersona || (!generateOptions.bank && !generateOptions.property && !generateOptions.shares && !generateOptions.car)}
                >
                  <Bot size={16} />
                  开始生成
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 住户选择弹窗 */}
      {residentsModalOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-end pointer-events-auto">
          {/* 点击背景关闭 */}
          <div className="absolute inset-0" onClick={() => setResidentsModalOpen(false)}></div>
          
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full h-[70vh] bg-[#0c0d12]/90 border-t border-white/10 rounded-t-[32px] backdrop-blur-2xl flex flex-col relative z-10"
          >
            {/* 拖动指示器 */}
            <div className="w-full h-8 flex items-center justify-center shrink-0 cursor-grab" onClick={() => setResidentsModalOpen(false)}>
              <div className="w-12 h-1.5 rounded-full bg-white/20"></div>
            </div>

            <div className="px-6 pb-4 flex items-center justify-between border-b border-white/5">
              <div>
                <h2 className="text-white text-lg font-medium tracking-wider">选择住户</h2>
                <p className="text-white/40 text-xs tracking-widest mt-1">入驻 {selectedHouse?.name || '当前房屋'}</p>
              </div>
              <button 
                onClick={handleSaveResidents}
                className="px-5 py-2 bg-white text-black font-medium tracking-widest rounded-xl hover:bg-white/90 transition-colors text-sm"
              >
                确定
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
              <div className="flex flex-col gap-3">
                {/* 自己选项 */}
                <label className="relative flex items-center p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors group overflow-hidden">
                  {/* 选中背景高亮 */}
                  <div className={`absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 transition-opacity ${selectedResidents.includes('user') ? 'opacity-100' : ''}`}></div>
                  
                  <div className="relative flex items-center justify-center z-10 mr-4">
                    <input 
                      type="checkbox" 
                      className="peer sr-only"
                      checked={selectedResidents.includes('user')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedResidents([...selectedResidents, 'user']);
                        } else {
                          setSelectedResidents(selectedResidents.filter(id => id !== 'user'));
                        }
                      }}
                    />
                    <div className="w-6 h-6 rounded-full border border-white/30 peer-checked:bg-white peer-checked:border-white transition-colors flex items-center justify-center">
                      <svg className={`w-3.5 h-3.5 text-black transition-opacity ${selectedResidents.includes('user') ? 'opacity-100' : 'opacity-0'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                  </div>
                  
                  <div className="w-12 h-12 rounded-full border border-white/20 bg-white/10 flex items-center justify-center overflow-hidden z-10 shrink-0">
                    {myProfile?.avatar ? (
                      <img src={myProfile.avatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon size={20} className="text-white/50" />
                    )}
                  </div>
                  
                  <div className="ml-4 flex-1 z-10">
                    <div className="text-white font-medium tracking-wider">{myProfile?.real_name || myProfile?.name || '我自己'}</div>
                  </div>
                </label>

                {/* 角色选项列表 */}
                {personas.map(p => (
                  <label key={p.id} className="relative flex items-center p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors group overflow-hidden">
                    {/* 选中背景高亮 */}
                    <div className={`absolute inset-0 bg-gradient-to-r from-[#e87a90]/10 to-transparent opacity-0 transition-opacity ${selectedResidents.includes(p.id) ? 'opacity-100' : ''}`}></div>
                    
                    <div className="relative flex items-center justify-center z-10 mr-4">
                      <input 
                        type="checkbox" 
                        className="peer sr-only"
                        checked={selectedResidents.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedResidents([...selectedResidents, p.id]);
                          } else {
                            setSelectedResidents(selectedResidents.filter(id => id !== p.id));
                          }
                        }}
                      />
                      <div className="w-6 h-6 rounded-full border border-white/30 peer-checked:bg-[#e87a90] peer-checked:border-[#e87a90] transition-colors flex items-center justify-center">
                        <svg className={`w-3.5 h-3.5 text-white transition-opacity ${selectedResidents.includes(p.id) ? 'opacity-100' : 'opacity-0'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                    </div>
                    
                    <div className="w-12 h-12 rounded-full border border-white/20 bg-white/10 flex items-center justify-center overflow-hidden z-10 shrink-0">
                      {p.avatar ? (
                        <img src={p.avatar} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon size={20} className="text-white/50" />
                      )}
                    </div>
                    
                    <div className="ml-4 flex-1 z-10">
                      <div className="text-white font-medium tracking-wider">{p.name}</div>
                      <div className="text-white/40 text-xs tracking-widest mt-0.5 truncate max-w-[200px]">
                        {p.id === selectedPersona?.id ? '主人' : p.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* 编辑弹窗 */}
      {editModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-sm bg-white/10 border border-white/20 rounded-[28px] overflow-hidden backdrop-blur-xl shadow-2xl">
            {/* 弹窗头部 */}
            <div className="relative flex items-center justify-center p-5 border-b border-white/10">
              <h2 className="text-white font-medium tracking-wider">
                {formData.id ? '编辑' : '添加'}
                {editModal === 'bank' ? '银行卡' : editModal === 'property' ? '房产' : editModal === 'shares' ? '股份' : '车辆'}
              </h2>
              <button 
                onClick={() => setEditModal(null)}
                className="absolute right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X size={18} className="text-white/60" />
              </button>
            </div>

            {/* 弹窗表单 */}
            <div className="p-5 flex flex-col gap-4">
              {editModal === 'bank' && (
                <>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 ml-1">所属银行</label>
                    <input type="text" value={formData.bankName || ''} onChange={e => setFormData({...formData, bankName: e.target.value})} placeholder="例如：瑞士银行、花旗银行" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 ml-1">卡片类型</label>
                    <input type="text" value={formData.cardType || ''} onChange={e => setFormData({...formData, cardType: e.target.value})} placeholder="例如：百夫长黑金卡" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 ml-1">卡号</label>
                    <input type="text" value={formData.cardNumber || ''} onChange={e => setFormData({...formData, cardNumber: e.target.value})} placeholder="**** **** **** ****" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors font-mono tracking-wider" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 ml-1">当前余额</label>
                    <input type="text" value={formData.balance || ''} onChange={e => setFormData({...formData, balance: e.target.value})} placeholder="输入金额" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors" />
                  </div>
                </>
              )}

              {editModal === 'property' && (
                <>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 ml-1">房产名称</label>
                    <input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="例如：半山海景别墅、汤臣一品" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 ml-1">所在地</label>
                    <input type="text" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="例如：香港太平山顶" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 ml-1">占地面积 (㎡)</label>
                    <input type="text" value={formData.area || ''} onChange={e => setFormData({...formData, area: e.target.value})} placeholder="输入面积" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 ml-1">估值</label>
                    <input type="text" value={formData.valuation || ''} onChange={e => setFormData({...formData, valuation: e.target.value})} placeholder="当前市值" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors" />
                  </div>
                </>
              )}

              {editModal === 'shares' && (
                <>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 ml-1">公司/集团名称</label>
                    <input type="text" value={formData.company || ''} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="例如：靳寰集团、鼎盛资本" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors" />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs text-white/50 mb-1.5 ml-1">持股比例 (%)</label>
                      <input type="text" value={formData.ratio || ''} onChange={e => setFormData({...formData, ratio: e.target.value})} placeholder="例如：51" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-white/50 mb-1.5 ml-1">股份类型</label>
                      <input type="text" value={formData.type || ''} onChange={e => setFormData({...formData, type: e.target.value})} placeholder="原始股/干股等" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 ml-1">市值估值</label>
                    <input type="text" value={formData.valuation || ''} onChange={e => setFormData({...formData, valuation: e.target.value})} placeholder="输入估值" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors" />
                  </div>
                </>
              )}

              {editModal === 'car' && (
                <>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 ml-1">车辆品牌</label>
                    <input type="text" value={formData.brand || ''} onChange={e => setFormData({...formData, brand: e.target.value})} placeholder="例如：劳斯莱斯、宾利" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 ml-1">车型</label>
                    <input type="text" value={formData.model || ''} onChange={e => setFormData({...formData, model: e.target.value})} placeholder="例如：幻影、飞驰" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 ml-1">车牌号</label>
                    <input type="text" value={formData.plate || ''} onChange={e => setFormData({...formData, plate: e.target.value})} placeholder="例如：京A·88888" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 ml-1">估值</label>
                    <input type="text" value={formData.valuation || ''} onChange={e => setFormData({...formData, valuation: e.target.value})} placeholder="当前市值" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors" />
                  </div>
                </>
              )}

              <div className="flex gap-3 mt-2">
                {formData.id && (
                  <button 
                    className="w-12 h-[52px] bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center rounded-xl hover:bg-red-500/30 transition-colors shrink-0"
                    onClick={() => {
                      if (editModal === 'bank') {
                        const newBanks = banks.filter(b => b.id !== formData.id);
                        setBanks(newBanks);
                        localStorage.setItem(`cangxu_banks_${selectedPersona.id}`, JSON.stringify(newBanks));
                      } else if (editModal === 'property') {
                        const newProps = properties.filter(p => p.id !== formData.id);
                        setProperties(newProps);
                        localStorage.setItem(`cangxu_properties_${selectedPersona.id}`, JSON.stringify(newProps));
                      } else if (editModal === 'shares') {
                        const newShares = shares.filter(s => s.id !== formData.id);
                        setShares(newShares);
                        localStorage.setItem(`cangxu_shares_${selectedPersona.id}`, JSON.stringify(newShares));
                      } else if (editModal === 'car') {
                        const newCars = cars.filter(c => c.id !== formData.id);
                        setCars(newCars);
                        localStorage.setItem(`cangxu_cars_${selectedPersona.id}`, JSON.stringify(newCars));
                      }
                      setEditModal(null);
                      setFormData({});
                    }}
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button 
                  className="flex-1 py-3.5 bg-white text-black font-medium tracking-widest rounded-xl hover:bg-white/90 transition-colors"
                  onClick={handleSave}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'main' && (
        <div className="relative z-20 flex-1 flex flex-col w-full h-full pointer-events-none">
          {/* 原有顶部导航栏 */}
          <div className="flex items-center justify-between p-4 pt-12 pointer-events-auto">
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ChevronLeft size={24} className="text-white" />
            </button>
            <h1 className="text-lg font-medium tracking-widest absolute left-1/2 -translate-x-1/2">藏叙</h1>
            <div className="flex gap-3">
              <button className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors">
                <FileText size={16} className="text-white/80" />
              </button>
              <button className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors">
                <Eye size={16} className="text-white/80" />
              </button>
              <button className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors">
                <Bot size={16} className="text-white/80" />
              </button>
            </div>
          </div>

          {/* 中间头像选择区 */}
          <div className="flex-1 flex flex-col items-center justify-center pb-20">
            <div className="relative pointer-events-auto">
              {/* 头像光晕 */}
              <div className="absolute inset-0 bg-white/5 rounded-full blur-xl scale-150 animate-pulse-slow"></div>
              
              {/* 头像容器 */}
              <div className="relative w-28 h-28 rounded-full border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden mb-4 backdrop-blur-sm cursor-pointer group">
                {selectedPersona && selectedPersona.avatar ? (
                  <img src={selectedPersona.avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={48} className="text-white/30 group-hover:text-white/50 transition-colors" />
                )}
                
                {/* 隐藏的下拉选择，这里为了简化交互，点击头像循环切换角色 */}
                <select 
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full text-gray-800"
                  value={selectedPersona?.id || ''}
                  onChange={(e) => {
                    const p = personas.find(p => p.id === e.target.value);
                    setSelectedPersona(p || null);
                  }}
                >
                  <option value="" disabled className="text-gray-500">选择角色</option>
                  {personas.map(p => (
                    <option key={p.id} value={p.id} className="text-gray-800">{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-sm text-white/50 tracking-widest mt-2">
              {selectedPersona ? selectedPersona.name : '未选择'}
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="pb-16 flex justify-center pointer-events-auto">
            <button 
              className="px-12 py-3 border border-white/20 bg-white/5 hover:bg-white/10 transition-colors rounded text-sm tracking-[0.2em] backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedPersona}
              onClick={() => setView('list')}
            >
              进入
            </button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes twinkle {
          0% { opacity: 0.2; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.2); }
        }
        .animate-pulse-slow {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}} />

      {/* 房屋生成弹窗 */}
      {showGenerateModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-gray-900/80 border border-white/20 rounded-[28px] overflow-hidden backdrop-blur-xl shadow-2xl"
          >
            <div className="relative flex items-center justify-center p-5 border-b border-white/10">
              <h2 className="text-white font-medium tracking-wider">生成房屋结构</h2>
              <button 
                onClick={() => setShowGenerateModal(false)}
                className="absolute right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X size={18} className="text-white/60" />
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-5">
              <div>
                <label className="block text-xs text-white/50 mb-2 ml-1">设计思路 (可选)</label>
                <textarea 
                  value={generateDesignInput}
                  onChange={(e) => setGenerateDesignInput(e.target.value)}
                  placeholder="例如：一座位于山顶的现代玻璃别墅，带有无边泳池..."
                  className="w-full h-28 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors resize-none text-sm select-text touch-auto"
                  onPointerDown={(e) => e.stopPropagation()}
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button 
                  className="flex-1 py-3.5 bg-white/10 border border-white/10 text-white font-medium tracking-widest rounded-xl hover:bg-white/20 transition-colors"
                  onClick={() => setShowGenerateModal(false)}
                >
                  取消
                </button>
                <button 
                  className="flex-1 py-3.5 bg-white text-black font-medium tracking-widest rounded-xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                  onClick={handleGenerateHouse}
                >
                  <Bot size={16} />
                  开始生成
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
