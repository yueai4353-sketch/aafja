import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Home, ShoppingCart, Truck, Heart, ChevronLeft, ChevronDown, ChevronUp, Loader2, User } from 'lucide-react';
import { buildTaobaoAIContext } from '../utils/taobaoContext';
import { DexieChatDB } from '../db/index';

interface TaobaoAppProps {
  onBack: () => void;
}

const CATEGORIES = ['全部', '数码好物', '生活家居', '穿搭配饰', '美妆护肤', '情趣用品'];

export const TaobaoApp: React.FC<TaobaoAppProps> = ({ onBack }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompt' | 'logistics'>('prompt');
  const [expandedSection, setExpandedSection] = useState<'refresh' | 'search'>('refresh');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [currentView, setCurrentView] = useState<'home' | 'cart' | 'me' | 'orders'>('home');
  const [orderTab, setOrderTab] = useState<'全部' | '待付款' | '待发货' | '待收货' | '待评价'>('待发货');
  const [cartItems, setCartItems] = useState<Array<any & { quantity: number }>>(() => {
    try {
      const saved = localStorage.getItem('taobao_cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showPayModal, setShowPayModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [walletData, setWalletData] = useState<{balance: number, cards: any[]}>({ balance: 0, cards: [] });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('balance');
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [payNote, setPayNote] = useState('我们的情侣款🥺');
  const [myProfile, setMyProfile] = useState<{name?: string, avatar?: string}>({});
  const [selectedCartItems, setSelectedCartItems] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareOrder, setShareOrder] = useState<any>(null);
  const [selectedShareFriend, setSelectedShareFriend] = useState<string | null>(null);
  const [shareFriendsList, setShareFriendsList] = useState<any[]>([]);

  useEffect(() => {
    try {
      const profileStr = localStorage.getItem('os_my_profile');
      if (profileStr) {
        setMyProfile(JSON.parse(profileStr));
      }
    } catch (e) {}

    const syncWallet = () => {
      try {
        const balanceStr = localStorage.getItem('wechat_wallet_balance');
        const balance = balanceStr ? parseFloat(balanceStr) : 1000.00;
        const cardsStr = localStorage.getItem('wechat_bank_cards');
        const cards = cardsStr ? JSON.parse(cardsStr) : [];
        setWalletData({ balance, cards });
      } catch (e) {}
    };
    syncWallet();

    // 监听余额更新事件
    window.addEventListener('wallet_balance_updated', syncWallet);
    return () => window.removeEventListener('wallet_balance_updated', syncWallet);
  }, []);
  
  // Mouse drag scroll for categories
  const catRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const hasMoved = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    hasMoved.current = false;
    startX.current = e.pageX - (catRef.current?.offsetLeft || 0);
    scrollLeft.current = catRef.current?.scrollLeft || 0;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const x = e.pageX - (catRef.current?.offsetLeft || 0);
    const walk = x - startX.current;
    if (Math.abs(walk) > 3) hasMoved.current = true;
    if (catRef.current) {
      catRef.current.scrollLeft = scrollLeft.current - walk;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const [refreshPrompt, setRefreshPrompt] = useState(() => {
    try { return localStorage.getItem('taobao_refresh_prompt') || ''; } catch { return ''; }
  });
  const [products, setProducts] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('taobao_products');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isLoading, setIsLoading] = useState(false);

  // 添加订单状态
  const [orders, setOrders] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('taobao_orders');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // 监听替付成功事件 - 当AI回复包含[TAOBAO_PAID]时触发
  useEffect(() => {
    const handleTaobaoPaid = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.items) {
        // 将替付的商品移入订单
        const newOrder = {
          id: `DD${Date.now()}${Math.floor(Math.random()*1000)}`,
          items: detail.items,
          total: detail.total || detail.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0),
          status: '待发货',
          timestamp: Date.now(),
          paidBy: detail.paidBy || '好友'
        };
        setOrders(prev => [newOrder, ...prev]);
        // 从购物车移除已替付的商品
        const paidTitles = new Set(detail.items.map((i: any) => i.title));
        setCartItems(prev => prev.filter(item => !paidTitles.has(item.title)));
        setSelectedCartItems(new Set());
      }
    };
    window.addEventListener('taobao-paid', handleTaobaoPaid);
    return () => window.removeEventListener('taobao-paid', handleTaobaoPaid);
  }, []);

  // 监听聊天更新，检测AI是否回复了[TAOBAO_PAID]
  useEffect(() => {
    const checkForPaidResponse = async () => {
      try {
        // 获取所有消息，检查是否有未处理的TAOBAO_PAID标记
        const allMessages = await DexieChatDB.messages.toArray();
        
        // 按时间排序（最新在前）
        allMessages.sort((a, b) => (b.fullTimestamp || 0) - (a.fullTimestamp || 0));
        
        for (const msg of allMessages) {
          if (!msg.isMe && msg.text && msg.text.includes('[TAOBAO_PAID]')) {
            // 检查此消息是否已处理过
            const processedKey = `taobao_paid_processed_${msg.id}`;
            if (localStorage.getItem(processedKey)) continue;
            localStorage.setItem(processedKey, '1');
            
            // 查找对应的替付请求（同一联系人的TAOBAO_PAY消息）
            const payMsg = allMessages.find(m => 
              m.contactId === msg.contactId && 
              m.isMe === true && 
              m.text && 
              m.text.includes('[TAOBAO_PAY]')
            );
            
            if (payMsg) {
              const match = payMsg.text.match(/\[TAOBAO_PAY\]([\s\S]*?)\[\/TAOBAO_PAY\]/);
              if (match) {
                try {
                  const payData = JSON.parse(match[1]);
                  console.log('[淘宝] 检测到替付成功，移入订单:', payData);
                  // 触发事件
                  window.dispatchEvent(new CustomEvent('taobao-paid', {
                    detail: {
                      items: payData.items,
                      total: payData.total,
                      paidBy: '好友'
                    }
                  }));
                } catch (e) {
                  console.error('[淘宝] 解析替付数据失败:', e);
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('[淘宝] 检查替付回复失败:', e);
      }
    };

    // 组件挂载时立即检查一次
    setTimeout(checkForPaidResponse, 300);

    const handler = () => { setTimeout(checkForPaidResponse, 500); };
    window.addEventListener('chat-db-updated', handler);
    return () => window.removeEventListener('chat-db-updated', handler);
  }, []);

  // 持久化订单
  useEffect(() => {
    localStorage.setItem('taobao_orders', JSON.stringify(orders));
  }, [orders]);

  // 持久化购物车
  useEffect(() => {
    localStorage.setItem('taobao_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // 持久化商品列表
  useEffect(() => {
    localStorage.setItem('taobao_products', JSON.stringify(products));
  }, [products]);

  // 持久化刷新提示词
  useEffect(() => {
    localStorage.setItem('taobao_refresh_prompt', refreshPrompt);
  }, [refreshPrompt]);

  // 调用主API获取商品推荐
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    setShowSettings(false);
    
    try {
      const apiKey = (localStorage.getItem('os_api_key') || '').trim();
      const apiBaseUrl = (localStorage.getItem('os_api_url') || 'https://api.openai.com/v1').replace(/\/$/, '');
      const apiModel = (localStorage.getItem('os_api_model') || '').trim();

      if (!apiKey) {
        alert('未配置 API Key，请先在设置中填写');
        setIsLoading(false);
        return;
      }

      // 获取当前联系人和人设信息
      let persona: any = null;
      let myProfile: any = {};
      let contactId = '';
      try {
        const currentContact = localStorage.getItem('os_current_contact');
        if (currentContact) {
          const contact = JSON.parse(currentContact);
          contactId = contact.id || '';
        }
        const personas = localStorage.getItem('os_personas');
        if (personas) {
          const allPersonas = JSON.parse(personas);
          persona = allPersonas[0] || null;
        }
        const myProfileStr = localStorage.getItem('os_my_profile');
        if (myProfileStr) {
          myProfile = JSON.parse(myProfileStr);
        }
      } catch (e) {}

      // 构建提示词
      const context = await buildTaobaoAIContext(persona, contactId, myProfile, activeCategory);
      if (!context) {
        setIsLoading(false);
        return;
      }

      // 注入用户自定义的首页刷新提示词
      let finalPrompt = context.prompt;
      if (refreshPrompt.trim()) {
        finalPrompt += `\n\n【用户额外要求】\n${refreshPrompt.trim()}`;
      }

      let completionsUrl = apiBaseUrl;
      if (!completionsUrl.endsWith('/chat/completions')) {
        completionsUrl = completionsUrl.endsWith('/')
          ? `${completionsUrl}chat/completions`
          : `${completionsUrl}/chat/completions`;
      }

      const response = await fetch(completionsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: apiModel,
          messages: [{ role: 'user', content: finalPrompt }],
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      // 解析 JSON 响应
      const jsonStr = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      
      // 提取所有商品
      let allItems: any[] = [];
      if (parsed.categories && Array.isArray(parsed.categories)) {
        parsed.categories.forEach((cat: any) => {
          if (cat.items && Array.isArray(cat.items)) {
            allItems = allItems.concat(cat.items.map((item: any) => ({ ...item, category: cat.name })));
          }
        });
      } else if (parsed.items && Array.isArray(parsed.items)) {
        allItems = parsed.items;
      }
      
      setProducts(allItems);
    } catch (e: any) {
      console.error('[淘宝] 刷新失败:', e);
      alert('刷新失败: ' + (e.message || '未知错误'));
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, refreshPrompt]);

  // 添加商品到购物车
  const addToCart = useCallback((product: any) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.title === product.title);
      if (existing) {
        return prev.map(item => item.title === product.title ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  // 修改购物车数量
  const updateCartQuantity = useCallback((title: string, delta: number) => {
    setCartItems(prev => {
      return prev.map(item => {
        if (item.title === title) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean) as any[];
    });
  }, []);

  // 从购物车删除
  const removeFromCart = useCallback((title: string) => {
    setCartItems(prev => prev.filter(item => item.title !== title));
  }, []);

  // 计算购物车总价（基于选中的商品）
  const selectedItems = cartItems.filter(item => selectedCartItems.has(item.title));
  const cartTotal = selectedItems.length > 0 
    ? selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    : cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const isAllSelected = cartItems.length > 0 && selectedCartItems.size === cartItems.length;

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedCartItems(new Set());
    } else {
      setSelectedCartItems(new Set(cartItems.map(i => i.title)));
    }
  };

  // 切换单个商品选中
  const toggleSelectItem = (title: string) => {
    setSelectedCartItems(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  // 获取结算用的商品列表
  const getCheckoutItems = () => {
    if (selectedCartItems.size > 0) return selectedItems;
    return cartItems;
  };
  const getCheckoutTotal = () => {
    return getCheckoutItems().reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 15 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 bg-[#F5F5F5] z-[100] flex flex-col pt-[env(safe-area-inset-top,0px)]"
    >
      {currentView === 'home' && (
        <>
          {/* Search Header */}
          <div className="bg-white pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-2 px-3 z-10 sticky top-0 border-b border-gray-100/50">
            <div className="flex gap-2 items-center h-10">
              <button onClick={onBack} className="p-2 -ml-2 text-gray-700 active:bg-gray-100 rounded-full transition-colors">
                <ChevronLeft size={24} />
              </button>
              <div className="flex-1 bg-[#F5F5F5] rounded-full flex items-center px-3 py-1.5 h-10 border border-[#FFE4D6]">
                <Search size={18} className="text-[#999999]" />
                <input type="text" placeholder="搜索商品" className="bg-transparent border-none outline-none ml-2 text-[14px] w-full text-[#333333] placeholder-[#999999]" />
              </div>
              <button className="bg-[#F5F5F5] text-[#999999] rounded-full px-4 text-[13px] font-medium h-10 whitespace-nowrap">搜索新物品</button>
            </div>
            <div ref={catRef} className="flex gap-2 mt-3 overflow-x-scroll pb-1 no-scrollbar cursor-grab active:cursor-grabbing select-none" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
              <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
              {CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => { if (!hasMoved.current) setActiveCategory(cat); }} className={`px-4 py-1.5 rounded-full text-[13px] font-medium shrink-0 transition-colors ${activeCategory === cat ? 'bg-[#FF8800] text-white shadow-[0_2px_8px_rgba(255,136,0,0.3)]' : 'bg-[#F5F5F5] text-[#666666] active:bg-[#E8E8E8]'}`}>{cat}</button>
              ))}
            </div>
          </div>

          {/* Main Content Area - Product Grid */}
          <div className="flex-1 bg-[#F5F5F5] overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Loader2 size={32} className="text-[#FF8800] animate-spin" />
                <span className="text-[13px] text-[#999]">正在为你挑选好物...</span>
              </div>
            ) : products.length > 0 ? (
              <div className="p-3 grid grid-cols-2 gap-3">
                {products.filter(p => activeCategory === '全部' || p.category === activeCategory).map((product, idx) => (
                  <div key={idx} className="bg-white rounded-[16px] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex flex-col">
                    <div className="relative h-[140px] bg-[#F9F9F9] flex items-center justify-center">
                      <span className="text-[48px]">{product.icon || '🛍️'}</span>
                      <button className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center shadow-sm">
                        <Heart size={14} className="text-[#CCCCCC]" />
                      </button>
                    </div>
                    <div className="p-3 flex flex-col gap-1.5 flex-1">
                      <p className="text-[13px] text-[#333] font-medium leading-tight line-clamp-2">{product.title}</p>
                      <p className="text-[11px] text-[#999]">{product.shop || product.category || ''}</p>
                      <div className="flex items-center justify-between mt-auto pt-1">
                        <span className="text-[#FF6600] text-[16px] font-bold">¥{product.price}</span>
                        <button onClick={() => addToCart(product)} className="w-6 h-6 rounded-full bg-[#FF6600] flex items-center justify-center active:scale-90 transition-transform">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2.5v7M2.5 6h7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-[#999]">
                <span className="text-[40px]">🛒</span>
                <span className="text-[13px]">点击右下角刷新按钮获取推荐</span>
              </div>
            )}
          </div>

          {/* Floating Buttons */}
          <div className="absolute right-4 bottom-20 z-20 flex flex-col gap-3 items-center">
            {products.length > 0 && (
              <button onClick={() => setProducts([])} className="bg-white w-11 h-11 rounded-full flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.12)] active:scale-95 transition-transform border border-gray-100">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#FF4444"/></svg>
              </button>
            )}
            <button onClick={() => setShowSettings(true)} className="bg-gradient-to-br from-[#FF9900] to-[#FF6600] w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_16px_rgba(255,136,0,0.4)] relative active:scale-95 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 4V1L8 5L12 9V6C15.31 6 18 8.69 18 12C18 13.01 17.75 13.97 17.3 14.8L18.76 16.26C19.54 15.03 20 13.57 20 12C20 7.58 16.42 4 12 4ZM12 18C8.69 18 6 15.31 6 12C6 10.99 6.25 10.03 6.7 9.2L5.24 7.74C4.46 8.97 4 10.43 4 12C4 16.42 7.58 20 12 20V23L16 19L12 15V18Z" fill="white"/></svg>
            </button>
          </div>
        </>
      )}

      {currentView === 'cart' && (
        <>
          {/* Cart View */}
          <div className="bg-white pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-2 px-3 z-10 sticky top-0 border-b border-gray-100/50">
            <div className="flex gap-2 items-center h-10">
              <button onClick={onBack} className="p-2 -ml-2 text-gray-700 active:bg-gray-100 rounded-full transition-colors">
                <ChevronLeft size={24} />
              </button>
              <div className="flex-1 bg-[#F5F5F5] rounded-full flex items-center px-3 py-1.5 h-10">
                <Search size={18} className="text-[#999999]" />
                <input type="text" placeholder="搜索购物车" className="bg-transparent border-none outline-none ml-2 text-[14px] w-full text-[#333333] placeholder-[#999999]" />
              </div>
            </div>
          </div>

          <div className="flex-1 bg-[#F5F5F5] overflow-y-auto px-4 pt-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[20px] font-bold text-[#333]">购物车</h2>
              {cartItems.length > 0 && (
                <button onClick={toggleSelectAll} className="text-[13px] text-[#FF8800] font-medium">
                  {isAllSelected ? '取消全选' : '全选'}
                </button>
              )}
            </div>
            
            {cartItems.length > 0 ? (
              <>
                <div className="flex flex-col gap-3 mb-4">
                  {cartItems.map((item, idx) => (
                    <div key={idx} className="bg-white rounded-[16px] p-4 shadow-sm flex gap-3 items-center">
                      {/* 多选复选框 */}
                      <button onClick={() => toggleSelectItem(item.title)} className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors" style={{ borderColor: selectedCartItems.has(item.title) ? '#FF8800' : '#DDD', backgroundColor: selectedCartItems.has(item.title) ? '#FF8800' : 'transparent' }}>
                        {selectedCartItems.has(item.title) && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5L5 9L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        )}
                      </button>
                      <div className="w-16 h-16 bg-[#F5F5F5] rounded-[12px] flex items-center justify-center shrink-0">
                        <span className="text-[32px]">{item.icon || '🛍️'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[14px] text-[#333] font-medium leading-tight line-clamp-1">{item.title}</p>
                          <button onClick={() => removeFromCart(item.title)} className="shrink-0 text-[#FF4444]">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#FF4444"/></svg>
                          </button>
                        </div>
                        <p className="text-[11px] text-[#999] mt-0.5">{item.shop || item.category || ''}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[#FF6600] text-[16px] font-bold">¥{item.price}</span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateCartQuantity(item.title, -1)} className="w-6 h-6 rounded-md border border-gray-200 flex items-center justify-center text-[#666] text-[14px]">−</button>
                            <span className="text-[13px] text-[#333] w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateCartQuantity(item.title, 1)} className="w-6 h-6 rounded-md border border-gray-200 flex items-center justify-center text-[#666] text-[14px]">+</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="bg-white rounded-[16px] p-4 shadow-sm mb-4">
                  <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
                    <span className="text-[13px] text-[#666]">商品金额</span>
                    <span className="text-[14px] text-[#333] font-medium">¥{cartTotal}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[15px] text-[#333] font-bold">应付总额</span>
                    <span className="text-[16px] text-[#333] font-bold">¥{cartTotal}</span>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => {
                      try {
                        const saved = localStorage.getItem('os_personas');
                        const list = saved ? JSON.parse(saved) : [];
                        setFriendsList(list);
                      } catch { setFriendsList([]); }
                      setSelectedFriend(null);
                      setShowPayModal(true);
                    }} className="flex-1 bg-white text-[#FF8800] py-3 rounded-full text-[15px] font-medium border-2 border-[#FF8800]">
                      找人替付
                    </button>
                    <button onClick={() => setShowCheckoutModal(true)} className="flex-1 bg-[#FF8800] text-white py-3 rounded-full text-[15px] font-medium shadow-[0_2px_8px_rgba(255,136,0,0.3)]">
                      结算
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#999]">
                <span className="text-[48px]">🛒</span>
                <span className="text-[13px]">购物车是空的</span>
              </div>
            )}
          </div>
        </>
      )}

      {currentView === 'me' && (
        <div className="flex-1 bg-[#F5F5F5] overflow-y-auto w-full z-10 flex flex-col relative">
          {/* Back button for Me view */}
          <div className="absolute top-[calc(env(safe-area-inset-top,0px)+12px)] left-3 z-20">
            <button onClick={onBack} className="p-2 -ml-2 text-gray-700 active:bg-gray-100 rounded-full transition-colors">
              <ChevronLeft size={24} />
            </button>
          </div>
          {/* Header area with Avatar and Name */}
          <div className="bg-white px-5 pt-[calc(env(safe-area-inset-top,0px)+52px)] pb-6 flex items-center gap-4">
            <div className="w-[60px] h-[60px] rounded-full overflow-hidden border border-gray-200 shrink-0 bg-[#f0f0f0]">
              <img 
                src={myProfile.avatar || "https://api.dicebear.com/9.x/avataaars/svg?seed=Felix&backgroundColor=f0f0f0"} 
                alt="Avatar" 
                className="w-full h-full object-cover" 
              />
            </div>
            <span className="text-[18px] font-medium text-[#333]">{myProfile.name || '无情道第一天才'}</span>
          </div>

          <div className="h-3 bg-[#F5F5F5]"></div>

          {/* First Row of Actions */}
          <div className="bg-white flex justify-around items-center py-6 border-b border-gray-50">
            <div onClick={() => { setOrderTab('待付款'); setCurrentView('orders'); }} className="flex flex-col items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M19 12h-3"/><path d="M16 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>
              </div>
              <span className="text-[12px] text-[#666]">待付款</span>
            </div>
            <div onClick={() => { setOrderTab('待发货'); setCurrentView('orders'); }} className="flex flex-col items-center gap-2 cursor-pointer relative">
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
              </div>
              {orders.filter(o => o.status === '待发货').length > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#FF4444] text-white text-[9px] min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 font-medium border border-white">
                  {orders.filter(o => o.status === '待发货').length}
                </span>
              )}
              <span className="text-[12px] text-[#666]">待发货</span>
            </div>
            <div onClick={() => { setOrderTab('待收货'); setCurrentView('orders'); }} className="flex flex-col items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M4 8V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2"/><circle cx="8" cy="15" r="2"/><circle cx="16" cy="15" r="2"/></svg>
              </div>
              <span className="text-[12px] text-[#666]">待收货</span>
            </div>
            <div onClick={() => { setOrderTab('待评价'); setCurrentView('orders'); }} className="flex flex-col items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="12" y1="7" x2="12" y2="13"/></svg>
              </div>
              <span className="text-[12px] text-[#666]">待评价</span>
            </div>
          </div>

          <div className="h-3 bg-[#F5F5F5]"></div>

          {/* Second Row of Actions */}
          <div className="bg-white flex justify-around items-center py-6">
            <div className="flex flex-col items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <span className="text-[12px] text-[#666]">收藏夹</span>
            </div>
            <div className="flex flex-col items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 flex items-center justify-center relative">
                <svg width="14" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-1 bottom-1"><path d="M12 12c-2-2.5-4-3-6-2C4 11 3 14 3 16c0 3 2 4 4 4s5-1.5 5-8Z"/><path d="M11 6c-1-1.5-2-2-3-1-1 1-1.5 3-1.5 4"/></svg>
                <svg width="14" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute right-1 top-1"><path d="M12 12c2-2.5 4-3 6-2 2 1 3 4 3 6 0 3-2 4-4 4s-5-1.5-5-8Z"/><path d="M13 6c1-1.5 2-2 3-1 1 1 1.5 3 1.5 4"/></svg>
              </div>
              <span className="text-[12px] text-[#666]">足迹</span>
            </div>
            <div className="flex flex-col items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1M4 17v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"/><path d="M4 12h16"/><path d="M4 7c1.1 0 2 1.3 2 3s-.9 3-2 3"/><path d="M20 7c-1.1 0-2 1.3-2 3s.9 3 2 3"/></svg>
              </div>
              <span className="text-[12px] text-[#666]">红包卡券</span>
            </div>
            <div className="flex flex-col items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V8a6 6 0 0 0-12 0v3"/><path d="M4 11h4v7H4z"/><path d="M16 11h4v7h-4z"/><path d="M12 18v3"/><path d="M8 21h8"/></svg>
              </div>
              <span className="text-[12px] text-[#666]">客服</span>
            </div>
          </div>
          {/* Fill the remaining space with the background color */}
          <div className="min-h-[50vh] bg-[#F5F5F5]"></div>
        </div>
      )}

      {currentView === 'orders' && (
        <div className="flex-1 bg-[#F5F5F5] overflow-y-auto w-full z-10 flex flex-col">
          {/* Header */}
          <div className="bg-white pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-0 px-3 z-10 sticky top-0 border-b border-gray-100">
            <div className="flex gap-2 items-center h-10 mb-2">
              <button onClick={() => setCurrentView('home')} className="p-2 -ml-2 text-gray-700 active:bg-gray-100 rounded-full transition-colors">
                <ChevronLeft size={24} />
              </button>
              <div className="flex-1 flex items-center justify-center pr-6">
                <Search size={18} className="text-[#999] mr-2" />
                <input type="text" placeholder="搜索订单" className="bg-[#F5F5F5] rounded-full px-4 py-1.5 text-[14px] w-full max-w-[200px] outline-none" />
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex justify-around items-center h-10">
              {['全部', '待付款', '待发货', '待收货', '待评价'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setOrderTab(tab as any)}
                  className={`text-[14px] relative h-full px-2 ${orderTab === tab || (tab === '全部' && !['待付款', '待发货', '待收货', '待评价'].includes(orderTab)) ? 'text-[#FF8800] font-bold' : 'text-[#666]'}`}
                >
                  {tab}
                  {(orderTab === tab || (tab === '全部' && !['待付款', '待发货', '待收货', '待评价'].includes(orderTab))) && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[3px] bg-[#FF8800] rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List */}
          <div className="p-3 flex flex-col gap-3">
            {orders.filter(o => {
              if (['全部', '待付款', '待发货', '待收货', '待评价'].includes(orderTab) && orderTab !== '全部') {
                return o.status === orderTab;
              }
              return true;
            }).length > 0 ? (
              orders.filter(o => {
                if (['全部', '待付款', '待发货', '待收货', '待评价'].includes(orderTab) && orderTab !== '全部') {
                  return o.status === orderTab;
                }
                return true;
              }).map((order, idx) => (
                <div key={idx} className="bg-white rounded-[16px] p-4 shadow-sm flex flex-col">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-50 mb-3">
                    <span className="text-[13px] text-[#333] font-medium flex items-center gap-1">
                      <Truck size={14} /> 淘宝自营
                    </span>
                    <span className="text-[13px] text-[#FF8800] font-medium">{order.status}</span>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    {order.items.map((item: any, iIdx: number) => (
                      <div key={iIdx} className="flex gap-3 items-center">
                        <div className="w-[72px] h-[72px] bg-[#F5F5F5] rounded-[8px] flex items-center justify-center shrink-0">
                          <span className="text-[32px]">{item.icon || '🛍️'}</span>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <p className="text-[14px] text-[#333] font-medium leading-tight line-clamp-2">{item.title}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[14px] font-bold text-[#333]">¥{item.price}</span>
                            <span className="text-[12px] text-[#999]">x{item.quantity}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-end items-center mt-4 pt-3 border-t border-gray-50">
                    <span className="text-[13px] text-[#666] mr-2">共 {order.items.reduce((acc: number, cur: any) => acc + cur.quantity, 0)} 件商品，实付款</span>
                    <span className="text-[16px] text-[#333] font-bold">¥{order.total}</span>
                  </div>
                  
                  <div className="flex justify-end items-center mt-3 gap-2">
                    {order.status === '待发货' && (
                      <>
                        <button onClick={() => {
                          setShareOrder(order);
                          setSelectedShareFriend(null);
                          try {
                            const saved = localStorage.getItem('os_personas');
                            setShareFriendsList(saved ? JSON.parse(saved) : []);
                          } catch { setShareFriendsList([]); }
                          setShowShareModal(true);
                        }} className="px-4 py-1.5 rounded-full border border-[#CCC] text-[#666] text-[13px]">分享</button>
                        <button className="px-4 py-1.5 rounded-full border border-[#CCC] text-[#666] text-[13px]">修改地址</button>
                        <button className="px-4 py-1.5 rounded-full border border-[#FF8800] text-[#FF8800] text-[13px]">催发货</button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#999]">
                <Truck size={48} strokeWidth={1} />
                <span className="text-[13px]">您还没有相关的订单</span>
              </div>
            )}
          </div>
          
          <div className="min-h-[100px] bg-[#F5F5F5]"></div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-[#EEEEEE] flex justify-around items-center pt-2 pb-[env(safe-area-inset-bottom,12px)] px-2 z-20 relative">
        <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>

        <button onClick={() => setCurrentView('home')} className="flex flex-col items-center gap-1 flex-1 py-1">
          <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center ${currentView === 'home' ? 'bg-[#FF8800]' : ''}`}>
            <Home size={22} className={currentView === 'home' ? 'text-white' : 'text-[#999999]'} />
          </div>
          <span className={`text-[10px] font-medium ${currentView === 'home' ? 'text-[#FF8800]' : 'text-[#999999]'}`}>首页</span>
        </button>
        
        <button onClick={() => setCurrentView('orders')} className="flex flex-col items-center gap-1 flex-1 py-1 relative">
          <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center ${currentView === 'orders' ? 'bg-[#FF8800]' : ''}`}>
            <Truck size={22} className={currentView === 'orders' ? 'text-white' : 'text-[#999999]'} />
          </div>
          {orders.filter(o => o.status === '待发货').length > 0 && (
            <span className="absolute top-0 right-[calc(50%-16px)] bg-[#FF4444] text-white text-[9px] min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 font-medium">{orders.filter(o => o.status === '待发货').length}</span>
          )}
          <span className={`text-[10px] font-medium ${currentView === 'orders' ? 'text-[#FF8800]' : 'text-[#999999]'}`}>订单</span>
        </button>
        
        <button onClick={() => setCurrentView('cart')} className="flex flex-col items-center gap-1 flex-1 py-1 relative">
          <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center ${currentView === 'cart' ? 'bg-[#FF8800]' : ''}`}>
            <ShoppingCart size={22} className={currentView === 'cart' ? 'text-white' : 'text-[#999999]'} />
          </div>
          {cartCount > 0 && (
            <span className="absolute top-0 right-[calc(50%-20px)] bg-[#FF4444] text-white text-[9px] min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 font-medium">{cartCount}</span>
          )}
          <span className={`text-[10px] font-medium ${currentView === 'cart' ? 'text-[#FF8800]' : 'text-[#999999]'}`}>购物车</span>
        </button>
        
        <button onClick={() => setCurrentView('me')} className="flex flex-col items-center gap-1 flex-1 py-1 relative">
          <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center ${currentView === 'me' ? 'bg-[#FF8800]' : ''}`}>
            <User size={22} className={currentView === 'me' ? 'text-white' : 'text-[#999999]'} />
          </div>
          <span className={`text-[10px] font-medium ${currentView === 'me' ? 'text-[#FF8800]' : 'text-[#999999]'}`}>我</span>
        </button>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/40 z-[110]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="absolute top-[10%] bottom-[10%] left-4 right-4 bg-[#F8F8F8] rounded-[24px] z-[120] flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center px-5 pt-5 pb-3">
                <h2 className="text-[18px] font-bold text-[#333]">购物设置</h2>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="bg-[#FFF0E5] text-[#FF8800] px-4 py-1.5 rounded-full text-[13px] font-medium"
                >
                  关闭
                </button>
              </div>

              {/* Tabs */}
              <div className="px-5 pb-4">
                <div className="flex bg-white rounded-full p-1 shadow-sm border border-gray-100">
                  <button 
                    onClick={() => setActiveTab('prompt')}
                    className={`flex-1 py-2 text-[14px] font-medium rounded-full transition-colors ${activeTab === 'prompt' ? 'bg-[#FF8800] text-white shadow-sm' : 'text-[#666]'}`}
                  >
                    提示词
                  </button>
                  <button 
                    onClick={() => setActiveTab('logistics')}
                    className={`flex-1 py-2 text-[14px] font-medium rounded-full transition-colors ${activeTab === 'logistics' ? 'bg-[#FF8800] text-white shadow-sm' : 'text-[#666]'}`}
                  >
                    物流时间
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto px-5 pb-20">
                {activeTab === 'prompt' && (
                  <div className="bg-white rounded-[16px] p-4 shadow-sm border border-gray-50">
                    <h3 className="text-[15px] font-bold text-[#333] mb-1">提示词</h3>
                    <p className="text-[12px] text-[#999] mb-4">点击条目展开编辑</p>

                    {/* Refresh Prompt Section */}
                    <div className="mb-3 border border-gray-100 rounded-[12px] overflow-hidden">
                      <button 
                        onClick={() => setExpandedSection(expandedSection === 'refresh' ? 'search' : 'refresh')}
                        className="w-full flex justify-between items-center px-4 py-3 bg-[#F8F9FA]"
                      >
                        <span className="text-[14px] font-medium text-[#333]">首页刷新</span>
                        {expandedSection === 'refresh' ? <ChevronUp size={18} className="text-[#666]" /> : <ChevronDown size={18} className="text-[#666]" />}
                      </button>
                      
                      {expandedSection === 'refresh' && (
                        <div className="p-3 bg-white border-t border-gray-100">
                          <textarea 
                            value={refreshPrompt}
                            onChange={(e) => setRefreshPrompt(e.target.value)}
                            className="w-full h-[180px] text-[13px] text-[#333] leading-relaxed resize-none outline-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* Search Prompt Section */}
                    <div className="border border-gray-100 rounded-[12px] overflow-hidden">
                      <button 
                        onClick={() => setExpandedSection(expandedSection === 'search' ? 'refresh' : 'search')}
                        className="w-full flex justify-between items-center px-4 py-3 bg-[#F8F9FA]"
                      >
                        <span className="text-[14px] font-medium text-[#333]">搜索结果</span>
                        {expandedSection === 'search' ? <ChevronUp size={18} className="text-[#666]" /> : <ChevronDown size={18} className="text-[#666]" />}
                      </button>
                      
                      {expandedSection === 'search' && (
                        <div className="p-3 bg-white border-t border-gray-100">
                          <textarea 
                            className="w-full h-[100px] text-[13px] text-[#333] leading-relaxed resize-none outline-none"
                            placeholder="搜索结果提示词..."
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 flex justify-between items-center">
                <button className="text-[13px] text-[#666] px-4 py-2 border border-gray-200 rounded-full">
                  恢复默认提示词
                </button>
                <button 
                  onClick={handleRefresh}
                  className="bg-[#FF8800] text-white px-8 py-2 rounded-full text-[14px] font-medium shadow-[0_2px_8px_rgba(255,136,0,0.3)]"
                >
                  刷新
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 结算支付弹窗 */}
      <AnimatePresence>
        {showCheckoutModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCheckoutModal(false)}
              className="absolute inset-0 bg-black/40 z-[130]"
            />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-[#F5F5F5] rounded-t-[20px] z-[140] flex flex-col h-[75vh]"
            >
              <div className="flex justify-between items-center px-4 pt-4 pb-3">
                <h3 className="text-[17px] font-bold text-[#333]">选择付款方式</h3>
                <button onClick={() => setShowCheckoutModal(false)} className="bg-[#FFF0E5] text-[#FF8800] px-3 py-1.5 rounded-full text-[13px] font-medium">Close</button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-8 flex flex-col gap-3">
                {/* 金额卡片 */}
                <div className="bg-[#FFF8F3] rounded-[16px] p-5 flex justify-between items-center">
                  <div>
                    <p className="text-[12px] text-[#FF8800] mb-1 font-medium">应付金额</p>
                    <p className="text-[28px] font-bold text-[#333] flex items-baseline leading-none"><span className="text-[20px] mr-0.5">¥</span>{cartTotal}</p>
                  </div>
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="12" rx="2" stroke="#FF8800" strokeWidth="2"/><path d="M3 10H21" stroke="#FF8800" strokeWidth="2"/></svg>
                  </div>
                </div>

                {/* 余额支付 */}
                <div 
                  onClick={() => setSelectedPaymentMethod('balance')}
                  className={`bg-white rounded-[16px] p-4 flex items-center gap-3 transition-colors ${selectedPaymentMethod === 'balance' ? 'border-[1.5px] border-[#FF8800]' : 'border-[1.5px] border-transparent'}`}
                >
                  <div className="w-12 h-12 bg-[#FF8800] rounded-[12px] flex items-center justify-center shrink-0">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="12" rx="2" stroke="white" strokeWidth="2"/><path d="M3 10H21" stroke="white" strokeWidth="2"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] text-[#333] font-bold">余额支付</p>
                    <p className="text-[12px] text-[#999] mt-0.5 truncate">红包、转账默认使用余额，可用 ¥{(walletData.balance || 0).toFixed(2)}</p>
                  </div>
                  {(walletData.balance || 0) < cartTotal && (
                    <span className="text-[12px] text-[#FF4444] font-medium shrink-0">余额不足</span>
                  )}
                </div>

                {/* 银行卡列表 */}
                {walletData.cards && walletData.cards.map((card: any, idx: number) => {
                  const isInsufficient = (card.balance || 0) < cartTotal;
                  return (
                    <div 
                      key={idx}
                      onClick={() => !isInsufficient && setSelectedPaymentMethod(card.id)}
                      className={`bg-white rounded-[16px] p-4 flex items-center gap-3 transition-colors ${selectedPaymentMethod === card.id ? 'border-[1.5px] border-[#FF8800]' : 'border-[1.5px] border-transparent'} ${isInsufficient ? 'opacity-70' : ''}`}
                    >
                      <div className="w-12 h-12 bg-[#F5F5F5] border border-[#EEEEEE] rounded-[12px] flex items-center justify-center shrink-0">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="12" rx="2" stroke="#666" strokeWidth="1.5"/><polyline points="3 10 21 10" stroke="#666" strokeWidth="1.5"/><path d="M7 15H9" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] text-[#333] font-bold">{card.name || '储蓄卡'}</p>
                        <p className="text-[12px] text-[#999] mt-0.5 truncate">尾号 {card.number} · {card.bank || '银行卡'} · 可用 ¥{(card.balance || 0).toFixed(2)}</p>
                      </div>
                      {isInsufficient && (
                        <span className="text-[12px] text-[#FF4444] font-medium shrink-0">余额不足</span>
                      )}
                    </div>
                  );
                })}

                {/* 底部提示 */}
                <div className="mt-2 bg-[#FFF5F5] rounded-[12px] p-3 flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" stroke="#FF4444" strokeWidth="1.5"/><line x1="12" y1="8" x2="12" y2="12" stroke="#FF4444" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="16" r="1" fill="#FF4444"/></svg>
                  <p className="text-[12px] text-[#FF4444] leading-snug">如果所选付款方式余额不足，将无法完成付款，请选择其他方式。</p>
                </div>
              </div>

              {/* 底部确认按钮 */}
              <div className="px-4 py-4 bg-white border-t border-[#EEEEEE]">
                <button 
                  onClick={() => {
                    const selectedMethod = selectedPaymentMethod === 'balance' 
                      ? { balance: walletData.balance } 
                      : walletData.cards?.find(c => c.id === selectedPaymentMethod);
                    
                    if (selectedMethod && (selectedMethod.balance || 0) < cartTotal) {
                      alert('该付款方式余额不足');
                      return;
                    }

                    alert('支付成功！');
                    
                    // 将选中的商品移入订单列表，状态设为"待发货"
                    const itemsToCheckout = getCheckoutItems();
                    const checkoutTotal = getCheckoutTotal();
                    const newOrder = {
                      id: `DD${Date.now()}${Math.floor(Math.random()*1000)}`,
                      items: [...itemsToCheckout],
                      total: checkoutTotal,
                      status: '待发货',
                      timestamp: Date.now()
                    };
                    setOrders(prev => [newOrder, ...prev]);

                    // 只移除已结算的商品
                    if (selectedCartItems.size > 0) {
                      setCartItems(prev => prev.filter(item => !selectedCartItems.has(item.title)));
                      setSelectedCartItems(new Set());
                    } else {
                      setCartItems([]);
                    }
                    setShowCheckoutModal(false);
                    setCurrentView('orders');
                    setOrderTab('待发货');
                  }}
                  className="w-full bg-[#FF8800] text-white py-3.5 rounded-full text-[16px] font-bold shadow-[0_4px_12px_rgba(255,136,0,0.3)] active:scale-[0.98] transition-transform"
                >
                  确认付款 ¥{cartTotal}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 分享订单弹窗 */}
      <AnimatePresence>
        {showShareModal && shareOrder && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareModal(false)}
              className="absolute inset-0 bg-black/40 z-[130]"
            />
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[24px] z-[140] flex flex-col max-h-[70%] shadow-2xl"
            >
              <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                <h3 className="text-[17px] font-bold text-[#333] text-center">分享订单</h3>
                <p className="text-[12px] text-[#999] text-center mt-1">选择一位微信好友分享订单信息</p>
              </div>
              
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {shareFriendsList.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {shareFriendsList.map((friend: any) => (
                      <button
                        key={friend.id}
                        onClick={() => setSelectedShareFriend(friend.id)}
                        className={`flex items-center gap-3 p-3 rounded-[14px] transition-colors ${selectedShareFriend === friend.id ? 'bg-[#FFF5EC] border-2 border-[#FF8800]' : 'bg-[#F8F8F8] border-2 border-transparent'}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-[#E8E8E8] flex items-center justify-center shrink-0 overflow-hidden">
                          {friend.avatar ? (
                            <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[14px] font-medium text-[#666]">{(friend.name || '?').charAt(0)}</span>
                          )}
                        </div>
                        <span className="text-[14px] text-[#333] font-medium">{friend.wechatName || friend.name || '未命名'}</span>
                        {selectedShareFriend === friend.id && (
                          <div className="ml-auto w-5 h-5 rounded-full bg-[#FF8800] flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5L5 9L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-[#999]">
                    <span className="text-[32px] mb-2">😅</span>
                    <span className="text-[13px]">暂无好友</span>
                  </div>
                )}
              </div>
              <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 py-3 rounded-full text-[15px] font-medium border-2 border-gray-200 text-[#666]"
                >
                  取消
                </button>
                <button
                  onClick={async () => {
                    if (!selectedShareFriend) {
                      alert('请先选择一位好友');
                      return;
                    }
                    const friend = shareFriendsList.find((f: any) => f.id === selectedShareFriend);
                    const friendName = friend?.wechatName || friend?.name || '好友';
                    
                    // 构建分享数据 (Gift Card 格式)
                    const giftCardData = JSON.stringify({
                      title: shareOrder.items[0]?.title || '精选商品',
                      shop: shareOrder.items[0]?.shop || '淘宝自营',
                      price: shareOrder.total,
                      id: shareOrder.id || `G-ITEM${Math.floor(Math.random()*100)}`,
                      timestamp: Date.now()
                    });
                    const shareText = `[GIFT_CARD]${giftCardData}[/GIFT_CARD]`;
                    
                    // 写入微信聊天数据库
                    try {
                      await DexieChatDB.messages.add({
                        contactId: String(friend.id),
                        fullTimestamp: Date.now(),
                        text: shareText,
                        isMe: true,
                        msgType: 'text',
                      });
                      // 通知微信刷新聊天数据
                      window.dispatchEvent(new CustomEvent('chat-db-updated'));
                      console.log('[淘宝] 分享消息已发送到微信聊天');
                    } catch (e) {
                      console.error('[淘宝] 发送分享消息失败:', e);
                    }
                    
                    alert(`已分享给 ${friendName}！`);
                    setShowShareModal(false);
                  }}
                  className="flex-1 py-3 rounded-full text-[15px] font-medium bg-[#FF8800] text-white shadow-[0_2px_8px_rgba(255,136,0,0.3)]"
                >
                  分享
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 找人替付弹窗 */}
      <AnimatePresence>
        {showPayModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPayModal(false)}
              className="absolute inset-0 bg-black/40 z-[130]"
            />
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[24px] z-[140] flex flex-col max-h-[70%] shadow-2xl"
            >
              <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                <h3 className="text-[17px] font-bold text-[#333] text-center">选择好友替付</h3>
                <p className="text-[12px] text-[#999] text-center mt-1">选择一位微信好友帮你付款</p>
              </div>
              
              {/* 备注输入框 */}
              <div className="px-5 py-3 bg-[#F8F8F8]">
                <label className="text-[13px] text-[#666] mb-2 block">备注留言</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="我们的情侣款🥺"
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-[10px] text-[14px] text-[#333] placeholder-[#BBB] outline-none focus:border-[#FF8800] transition-colors"
                />
              </div>
              
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {friendsList.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {friendsList.map((friend: any) => (
                      <button
                        key={friend.id}
                        onClick={() => setSelectedFriend(friend.id)}
                        className={`flex items-center gap-3 p-3 rounded-[14px] transition-colors ${selectedFriend === friend.id ? 'bg-[#FFF5EC] border-2 border-[#FF8800]' : 'bg-[#F8F8F8] border-2 border-transparent'}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-[#E8E8E8] flex items-center justify-center shrink-0 overflow-hidden">
                          {friend.avatar ? (
                            <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[14px] font-medium text-[#666]">{(friend.name || '?').charAt(0)}</span>
                          )}
                        </div>
                        <span className="text-[14px] text-[#333] font-medium">{friend.wechatName || friend.name || '未命名'}</span>
                        {selectedFriend === friend.id && (
                          <div className="ml-auto w-5 h-5 rounded-full bg-[#FF8800] flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5L5 9L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-[#999]">
                    <span className="text-[32px] mb-2">😅</span>
                    <span className="text-[13px]">暂无好友</span>
                  </div>
                )}
              </div>
              <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => setShowPayModal(false)}
                  className="flex-1 py-3 rounded-full text-[15px] font-medium border-2 border-gray-200 text-[#666]"
                >
                  取消
                </button>
                <button
                  onClick={async () => {
                    if (!selectedFriend) {
                      alert('请先选择一位好友');
                      return;
                    }
                    const friend = friendsList.find((f: any) => f.id === selectedFriend);
                    const friendName = friend?.wechatName || friend?.name || '好友';
                    
                    // 构建替付卡片数据（使用选中的商品）
                    const itemsForPay = getCheckoutItems();
                    const totalForPay = getCheckoutTotal();
                    const payCardData = JSON.stringify({
                      items: itemsForPay.map(item => ({ title: item.title, icon: item.icon || '🛍️', price: item.price, quantity: item.quantity })),
                      total: totalForPay,
                      note: payNote || '我们的情侣款🥺',
                      timestamp: Date.now(),
                    });
                    const msgText = `[TAOBAO_PAY]${payCardData}[/TAOBAO_PAY]`;
                    
                    // 写入微信聊天数据库
                    try {
                      await DexieChatDB.messages.add({
                        contactId: String(friend.id),
                        fullTimestamp: Date.now(),
                        text: msgText,
                        isMe: true,
                        msgType: 'text',
                      });
                      // 通知微信刷新聊天数据
                      window.dispatchEvent(new CustomEvent('chat-db-updated'));
                      console.log('[淘宝] 替付消息已发送到微信聊天');
                    } catch (e) {
                      console.error('[淘宝] 发送消息失败:', e);
                    }
                    
                    alert(`已向 ${friendName} 发送替付请求！`);
                    setShowPayModal(false);
                  }}
                  className="flex-1 py-3 rounded-full text-[15px] font-medium bg-[#FF8800] text-white shadow-[0_2px_8px_rgba(255,136,0,0.3)]"
                >
                  发送
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </motion.div>
  );
};
