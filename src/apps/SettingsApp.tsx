import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Moon, Signal, Wifi, Battery, ChevronLeft, Plus, Globe, ChevronDown, ChevronUp, Download, Upload, Trash2, Check } from 'lucide-react';
import { CurrentTime } from '../components';
import { exportAppData, importAppData } from '../utils/backupManager';
import { DexieChatDB } from '../db';

// 自定义模型选择器，避免原生 select 在 overflow-hidden 容器中无法弹出的问题
const ModelSelect = ({
  value,
  onChange,
  options,
  disabled,
  placeholder = '-- 请先测试连接以加载模型 --',
}: {
  value: string;
  onChange: (val: string) => void;
  options: { id: string; name: string }[];
  disabled?: boolean;
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const displayLabel = options.find(o => o.id === value)?.name ?? (value || placeholder);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className={`w-full flex items-center justify-between bg-white border rounded-xl px-4 py-3 text-[14px] text-left transition-all font-light
          ${disabled
            ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
            : 'border-gray-200 text-gray-600 cursor-pointer active:bg-gray-50'
          }`}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown size={14} className={`shrink-0 ml-2 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && options.length > 0 && (
        <div
          className="absolute left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl overflow-y-auto max-h-48"
          style={{ top: 'calc(100% + 4px)', zIndex: 9999 }}
        >
          {options.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => { onChange(opt.id); setOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 text-[14px] text-left hover:bg-gray-50 transition-colors
                ${opt.id === value ? 'text-blue-500 font-medium' : 'text-gray-700 font-light'}`}
            >
              <span className="truncate">{opt.name}</span>
              {opt.id === value && <Check size={14} className="shrink-0 ml-2 text-blue-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const API_PRESETS = [
  { id: '', name: '-- 选择预设快速填充 --', url: '' },
  { id: 'openai', name: 'OpenAI', url: 'https://api.openai.com/v1' },
  { id: 'gemini', name: 'Google Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  { id: 'zhipu', name: '智谱 AI', url: 'https://open.bigmodel.cn/api/paas/v4' },
  { id: 'volcengine', name: '火山引擎', url: 'https://ark.cn-beijing.volces.com/api/v3' },
  { id: 'deepseek', name: 'DeepSeek', url: 'https://api.deepseek.com/v1' }
];

export const SettingsApp = ({ onBack, desktopBg, key }: { onBack: () => void, desktopBg?: string | null, key?: React.Key }) => {
  const [preset, setPreset] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [contextMemSize, setContextMemSize] = useState(50);
  const [mandatoryMemSize, setMandatoryMemSize] = useState(10);
  const [models, setModels] = useState<{id: string, name: string}[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [toast, setToast] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [customPresets, setCustomPresets] = useState<{id: string, name: string, url: string}[]>([]);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');

  // Memory API configuration states
  const [memoryApiUrl, setMemoryApiUrl] = useState('');
  const [memoryApiKey, setMemoryApiKey] = useState('');
  const [memoryModels, setMemoryModels] = useState<{id: string, name: string}[]>([]);
  const [memorySelectedModel, setMemorySelectedModel] = useState('');
  const [isTestingMemory, setIsTestingMemory] = useState(false);

  // Card expanded states
  const [expandedCard, setExpandedCard] = useState<'main' | 'memory' | ''>('');

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Data management
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      await exportAppData();
      showToast('数据导出成功');
    } catch (e: any) {
      showToast(`导出失败: ${e.message}`);
    }
  };

  const handleImport = () => {
    importFileRef.current?.click();
  };

  const handleClearAllData = async () => {
    try {
      // 清空 IndexedDB（所有表）
      await DexieChatDB.messages.clear();
      await DexieChatDB.appSettings.clear();
      await DexieChatDB.memories.clear();

      // 清空 localStorage
      localStorage.clear();

      // 清空 Cache Storage（Service Worker 缓存）
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      setShowClearConfirm(false);
      showToast('数据已清空，正在重启...');
      setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      setShowClearConfirm(false);
      showToast(`清空失败: ${e.message}`);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!window.confirm('警告：导入将覆盖当前所有数据！继续吗？')) return;
    try {
      await importAppData(file);
      showToast('数据导入成功，正在刷新...');
      setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      showToast(`导入失败: ${e.message}`);
    }
  };

  React.useEffect(() => {
    const savedUrl = localStorage.getItem('os_api_url') || '';
    const savedKey = localStorage.getItem('os_api_key') || '';
    const savedTemp = localStorage.getItem('os_api_temp');
    const savedContextMem = localStorage.getItem('os_api_context_mem');
    const savedMandatoryMem = localStorage.getItem('os_api_mandatory_mem');
    const savedModel = localStorage.getItem('os_api_model') || '';
    const savedPresets = localStorage.getItem('os_custom_presets');
    
    if (savedUrl) setApiUrl(savedUrl);
    if (savedKey) setApiKey(savedKey);
    if (savedTemp !== null) setTemperature(parseFloat(savedTemp));
    if (savedContextMem) setContextMemSize(parseInt(savedContextMem, 10));
    if (savedMandatoryMem) setMandatoryMemSize(parseInt(savedMandatoryMem, 10));
    if (savedPresets) {
      try {
        setCustomPresets(JSON.parse(savedPresets));
      } catch (e) {}
    }
    
    if (savedModel) {
      setSelectedModel(savedModel);
      setModels([{ id: savedModel, name: savedModel }]);
    }

    // Load Memory API configuration
    const savedMemoryUrl = localStorage.getItem('os_memory_api_url') || '';
    const savedMemoryKey = localStorage.getItem('os_memory_api_key') || '';
    const savedMemoryModel = localStorage.getItem('os_memory_api_model') || '';
    
    if (savedMemoryUrl) setMemoryApiUrl(savedMemoryUrl);
    if (savedMemoryKey) setMemoryApiKey(savedMemoryKey);
    if (savedMemoryModel) {
      setMemorySelectedModel(savedMemoryModel);
      setMemoryModels([{ id: savedMemoryModel, name: savedMemoryModel }]);
    }
  }, []);

  const allPresets = [...API_PRESETS, ...customPresets];

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setPreset(val);
    const selected = allPresets.find(p => p.id === val);
    if (selected && selected.url) {
      setApiUrl(selected.url);
    }
  };

  const handleSaveNewPreset = () => {
    if (!presetName.trim()) {
      showToast('请输入预设名称');
      return;
    }
    const newPreset = {
      id: `custom_${Date.now()}`,
      name: presetName.trim(),
      url: apiUrl
    };
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    localStorage.setItem('os_custom_presets', JSON.stringify(updated));
    setPreset(newPreset.id);
    setShowPresetModal(false);
    setPresetName('');
    showToast('预设已保存');
  };

  const handleSave = () => {
    localStorage.setItem('os_api_url', apiUrl);
    localStorage.setItem('os_api_key', apiKey);
    localStorage.setItem('os_api_temp', temperature.toString());
    localStorage.setItem('os_api_model', selectedModel);
    localStorage.setItem('os_api_context_mem', contextMemSize.toString());
    localStorage.setItem('os_api_mandatory_mem', mandatoryMemSize.toString());
    
    // Save Memory API configuration
    localStorage.setItem('os_memory_api_url', memoryApiUrl);
    localStorage.setItem('os_memory_api_key', memoryApiKey);
    localStorage.setItem('os_memory_api_model', memorySelectedModel);
    
    showToast('配置已保存');
  };

  const handleTest = async () => {
    if (!apiUrl) {
      showToast('API地址不能为空');
      return;
    }
    if (!apiKey) {
      showToast('API密钥不能为空');
      return;
    }
    setIsTesting(true);
    
    try {
      let baseUrl = apiUrl;
      if (baseUrl.endsWith('/chat/completions')) {
        baseUrl = baseUrl.replace('/chat/completions', '');
      }
      
      const endpoint = baseUrl.endsWith('/') ? `${baseUrl}models` : `${baseUrl}/models`;
      
      let validatedEndpoint: string;
      try {
        validatedEndpoint = new URL(endpoint).toString();
      } catch (_e) {
        throw new Error('API 地址格式不正确，请检查是否包含 https://');
      }
      
      const response = await fetch(validatedEndpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.data && Array.isArray(data.data)) {
        const fetchedModels = data.data.map((m: any) => ({
          id: m.id,
          name: m.id
        }));
        setModels(fetchedModels);
        if (fetchedModels.length > 0) {
          setSelectedModel(fetchedModels[0].id);
        }
        showToast('连接测试成功，已加载模型');
      } else {
        throw new Error('API 返回格式不支持');
      }
    } catch (error: any) {
      console.error(error);
      showToast(`连接失败: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestMemory = async () => {
    if (!memoryApiUrl) {
      showToast('记忆API地址不能为空');
      return;
    }
    if (!memoryApiKey) {
      showToast('记忆API密钥不能为空');
      return;
    }
    setIsTestingMemory(true);
    
    try {
      let baseUrl = memoryApiUrl;
      if (baseUrl.endsWith('/chat/completions')) {
        baseUrl = baseUrl.replace('/chat/completions', '');
      }
      
      const endpoint = baseUrl.endsWith('/') ? `${baseUrl}models` : `${baseUrl}/models`;
      
      let validatedEndpoint: string;
      try {
        validatedEndpoint = new URL(endpoint).toString();
      } catch (_e) {
        throw new Error('API 地址格式不正确，请检查是否包含 https://');
      }
      
      const response = await fetch(validatedEndpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${memoryApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.data && Array.isArray(data.data)) {
        const fetchedModels = data.data.map((m: any) => ({
          id: m.id,
          name: m.id
        }));
        setMemoryModels(fetchedModels);
        if (fetchedModels.length > 0) {
          setMemorySelectedModel(fetchedModels[0].id);
        }
        showToast('记忆API连接测试成功，已加载模型');
      } else {
        throw new Error('API 返回格式不支持');
      }
    } catch (error: any) {
      console.error(error);
      showToast(`记忆API连接失败: ${error.message}`);
    } finally {
      setIsTestingMemory(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 15 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 z-[60] flex flex-col pt-4 overflow-hidden"
    >
      {/* Dynamic Background matching Desktop with 10% Blur */}
      {desktopBg ? (
        <>
          <div 
            className="absolute inset-0 z-[-2] scale-110" 
            style={{ 
              background: `url(${desktopBg}) center/cover no-repeat`,
              filter: 'blur(10px) brightness(0.9)'
            }}
          />
          <div className="absolute inset-0 z-[-1] bg-white/40" />
        </>
      ) : (
        <div className="absolute inset-0 z-[-1] bg-[#eef2f9]" />
      )}
      
      {/* Toast Notification */}
      {toast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-gray-800/90 backdrop-blur text-white px-5 py-2.5 rounded-full text-[13px] font-medium shadow-lg z-[60] transition-opacity duration-300">
          {toast}
        </div>
      )}

      {/* Preset Modal */}
      {showPresetModal && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setShowPresetModal(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-[320px] p-6 relative z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-[16px] font-medium text-gray-800 mb-4 text-center">保存预设</h3>
            <div className="mb-5">
              <input
                type="text"
                autoFocus
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="请输入预设名称"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFF0F5]/80 focus:border-[#fce4ec] transition-all font-light"
              />
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowPresetModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl text-[14px] font-medium"
              >
                取消
              </button>
              <button 
                onClick={handleSaveNewPreset}
                className="flex-1 py-3 bg-[#FFF0F5] text-gray-700 border border-[#fce4ec] rounded-xl text-[14px] font-medium"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Status Bar */}
      <div className="flex justify-between items-center px-7 text-[13px] font-medium text-gray-800 shrink-0 relative z-10">
        <div className="flex items-center">
          <CurrentTime /> <Moon size={11} className="ml-1 opacity-80" fill="currentColor" strokeWidth={1} />
        </div>
        <div className="flex items-center gap-1.5 opacity-60">
          <Signal size={14} strokeWidth={2.5} />
          <Wifi size={14} strokeWidth={2.5} />
          <Battery size={16} strokeWidth={2} />
        </div>
      </div>

      {/* Settings Header */}
      <div className="flex items-center justify-between px-4 py-4 shrink-0 mt-2 relative z-10">
        <div className="flex items-center">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-white rounded-full text-gray-800 shadow-[0_2px_8px_rgba(0,0,0,0.05)] active:scale-95 transition-transform">
            <ChevronLeft size={20} strokeWidth={2.5} className="mr-0.5" />
          </button>
        </div>
        <button className="px-5 py-2 bg-white/90 backdrop-blur-md rounded-full text-[14px] font-medium text-blue-500 shadow-[0_2px_8px_rgba(0,0,0,0.05)] active:scale-95 transition-transform">
          保存
        </button>
      </div>

      {/* Title */}
      <div className="px-6 py-2 shrink-0 relative z-10">
        <h1 className="text-[32px] font-bold text-gray-800 tracking-tight">API 设置</h1>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-10 relative z-10">
        {/* Main API Configuration Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[28px] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-white/50 mb-6 transition-all duration-300">
          <div 
            className="px-5 py-5 flex items-center justify-between cursor-pointer active:bg-white/50 transition-colors"
            onClick={() => setExpandedCard(expandedCard === 'main' ? '' as any : 'main')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Globe size={20} className="text-blue-500" />
              </div>
              <div>
                <h3 className="text-[16px] font-medium text-gray-800">主API配置</h3>
                <p className="text-[12px] text-gray-400 mt-0.5">基础大模型与预设管理</p>
              </div>
            </div>
            {expandedCard === 'main' ? (
              <ChevronUp size={20} className="text-gray-400" />
            ) : (
              <ChevronDown size={20} className="text-gray-400" />
            )}
          </div>
          
          <AnimatePresence>
            {expandedCard === 'main' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-6 pt-2 flex flex-col gap-6 border-t border-gray-100/50">
            {/* Presets Box */}
            <div className="relative border-b border-gray-100/50 pb-6">
              <div className="flex justify-between items-center mb-4 px-1">
                <label className="text-[14px] font-medium text-gray-400 tracking-widest">主API预设管理</label>
              </div>
              <div className="flex justify-between items-center mb-4 px-1">
                <label className="text-[15px] font-medium text-gray-200">配置预设</label>
                <button 
                  onClick={() => setShowPresetModal(true)}
                  className="flex items-center gap-1 bg-[#FFF0F5] text-gray-700 border border-[#fce4ec] px-3 py-1.5 rounded-lg text-[13px] font-normal active:opacity-80 transition-opacity"
                >
                  <Plus size={14} strokeWidth={2} /> 保存为预设
                </button>
              </div>
              
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <select 
                    value={preset}
                    onChange={handlePresetChange}
                    className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#FFF0F5]/80 focus:border-[#fce4ec] transition-all font-light"
                  >
                    {allPresets.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
                  </div>
                </div>
                <button 
                  onClick={() => showToast('预设管理开发中')}
                  className="bg-white/90 border border-gray-100 shadow-sm rounded-xl px-4 text-[14px] text-gray-500 active:bg-gray-50 transition-colors whitespace-nowrap font-medium"
                >
                  管理
                </button>
              </div>
              <p className="text-[12px] text-gray-400 mt-4 text-center font-medium leading-relaxed">
                选择预设会填充下方配置，需点击「保存配置」才生效
              </p>
              <div className="flex items-center justify-center gap-2 mt-4 text-[#8ea8f7] opacity-60">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                <span className="text-[13px] font-medium">保存为新预设</span>
              </div>
            </div>

            <div className="mb-[-10px] mt-2 px-1">
               <label className="text-[14px] font-medium text-gray-400 tracking-widest uppercase">API Setting</label>
            </div>

            {/* API URL */}
            <div>
              <label className="block text-[14px] font-medium text-gray-800 mb-2.5">API地址</label>
              <input 
                type="text" 
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="例如：https://api.openai.com" 
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFF0F5]/80 focus:border-[#fce4ec] transition-all font-light"
              />
              <p className="text-[12px] text-gray-400 mt-2 font-light leading-relaxed">
                支持OpenAI兼容接口，输入域名即可自动补全。<br/>
                火山引擎填到 /api/v3，智谱AI填到 /api/paas/v4
              </p>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-[14px] font-medium text-gray-800 mb-2.5">API密钥</label>
              <input 
                type="password" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="输入你的API Key" 
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFF0F5]/80 focus:border-[#fce4ec] transition-all font-light"
              />
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-[14px] font-medium text-gray-800 mb-2.5">选择模型</label>
              <ModelSelect
                value={selectedModel}
                onChange={setSelectedModel}
                options={models}
                disabled={models.length === 0}
                placeholder="-- 请先测试连接以加载模型 --"
              />
              <p className="text-[12px] text-gray-400 mt-2 text-center font-light leading-relaxed">
                测试连接成功后自动加载可用模型
              </p>
            </div>

            {/* Temperature */}
            <div>
              <label className="block text-[14px] font-medium text-gray-800 mb-4">温度 (Temperature)</label>
              <div className="flex items-center gap-4">
                <div className="flex-1 relative flex items-center h-5">
                  <input 
                    type="range" 
                    min="0" max="2" step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  />
                  <div className="absolute inset-x-0 h-1 bg-gray-200 rounded-full"></div>
                  <div 
                    className="absolute left-0 h-1 bg-[#f8d0de] rounded-full"
                    style={{ width: `${(temperature / 2) * 100}%` }}
                  ></div>
                  <div 
                    className="absolute w-5 h-5 bg-[#FFF0F5] border border-[#f8d0de] rounded-full shadow-md z-10 pointer-events-none"
                    style={{ left: `${(temperature / 2) * 100}%`, transform: 'translate(-50%, 0)' }}
                  ></div>
                </div>
                <span className="text-[14px] text-gray-700 font-medium w-6 text-right">{temperature.toFixed(1)}</span>
              </div>
              <p className="text-[12px] text-gray-400 mt-4 font-light leading-relaxed">
                控制AI回复的随机性和创造性 (0.0-2.0)。较低的值使回复更确定，较高的值使回复更有创造性
              </p>
            </div>

            {/* AI记忆设置 */}
            <div>
              <label className="block text-[14px] font-medium text-gray-800 mb-4">AI记忆设置</label>
              
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                   <div className="text-[13px] text-gray-700 font-medium">记忆注入量</div>
                   <input type="number" value={mandatoryMemSize} onChange={e => setMandatoryMemSize(Math.max(1, parseInt(e.target.value) || 10))} className="w-20 bg-gray-50 border border-gray-200 rounded text-center py-1 text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#fce4ec]" />
                </div>
                <p className="text-[11px] text-gray-400 font-light leading-relaxed mb-1 -mt-2">
                   AI每轮对话固定读取的最近消息条数（如10条）。
                </p>

                <div className="flex items-center justify-between">
                   <div className="text-[13px] text-gray-700 font-medium">上下文记忆条数</div>
                   <input type="number" value={contextMemSize} onChange={e => setContextMemSize(Math.max(1, parseInt(e.target.value) || 50))} className="w-20 bg-gray-50 border border-gray-200 rounded text-center py-1 text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#fce4ec]" />
                </div>
                <p className="text-[11px] text-gray-400 font-light leading-relaxed -mt-2">
                   在此范围内寻找与当前用户发送消息相关的关键词，有则额外拾取该历史内容供AI读取。
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-2">
              <button 
                onClick={handleTest}
                disabled={isTesting}
                className="flex items-center justify-center gap-1.5 flex-1 bg-white border border-[#fce4ec] text-gray-700 py-3.5 rounded-xl text-[14px] font-medium active:bg-[#FFF0F5] transition-colors disabled:opacity-50"
              >
                {isTesting ? (
                  <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <Globe size={16} strokeWidth={2} className="text-gray-500" /> 
                )}
                {isTesting ? '测试中...' : '测试连接'}
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 bg-[#F5F5F5] text-gray-800 py-3.5 rounded-xl text-[14px] font-medium active:bg-gray-200 transition-colors"
              >
                保存配置
              </button>
            </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Memory API Configuration Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[28px] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-white/50 mb-6 transition-all duration-300">
          <div 
            className="px-5 py-5 flex items-center justify-between cursor-pointer active:bg-white/50 transition-colors"
            onClick={() => setExpandedCard(expandedCard === 'memory' ? '' as any : 'memory')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-500"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/><path d="M12 7v5l3 3"/></svg>
              </div>
              <div>
                <h3 className="text-[16px] font-medium text-gray-800">记忆API配置</h3>
                <p className="text-[12px] text-gray-400 mt-0.5">专用于「记忆」app的配置</p>
              </div>
            </div>
            {expandedCard === 'memory' ? (
              <ChevronUp size={20} className="text-gray-400" />
            ) : (
              <ChevronDown size={20} className="text-gray-400" />
            )}
          </div>

          <AnimatePresence>
            {expandedCard === 'memory' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-6 pt-2 flex flex-col gap-6 border-t border-gray-100/50">
                  <div className="mb-[-10px] px-1">
                    <p className="text-[12px] text-gray-400 mt-2 font-light leading-relaxed">
                      若未配置，将自动使用主API配置
                    </p>
                  </div>

            {/* Memory API URL */}
            <div>
              <label className="block text-[14px] font-medium text-gray-800 mb-2.5">记忆API地址</label>
              <input 
                type="text" 
                value={memoryApiUrl}
                onChange={(e) => setMemoryApiUrl(e.target.value)}
                placeholder="留空则使用主API地址" 
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFF0F5]/80 focus:border-[#fce4ec] transition-all font-light"
              />
            </div>

            {/* Memory API Key */}
            <div>
              <label className="block text-[14px] font-medium text-gray-800 mb-2.5">记忆API密钥</label>
              <input 
                type="password" 
                value={memoryApiKey}
                onChange={(e) => setMemoryApiKey(e.target.value)}
                placeholder="留空则使用主API密钥" 
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFF0F5]/80 focus:border-[#fce4ec] transition-all font-light"
              />
            </div>

            {/* Memory Model Selection */}
            <div>
              <label className="block text-[14px] font-medium text-gray-800 mb-2.5">记忆模型</label>
              <ModelSelect
                value={memorySelectedModel}
                onChange={setMemorySelectedModel}
                options={memoryModels}
                disabled={memoryModels.length === 0}
                placeholder="-- 请先测试连接以加载模型 --"
              />
              <p className="text-[12px] text-gray-400 mt-2 text-center font-light leading-relaxed">
                留空则使用主API模型
              </p>
            </div>

            {/* Memory API Action Buttons */}
            <div className="flex gap-3 mt-2">
              <button 
                onClick={handleTestMemory}
                disabled={isTestingMemory || !memoryApiUrl || !memoryApiKey}
                className="flex items-center justify-center gap-1.5 flex-1 bg-white border border-[#fce4ec] text-gray-700 py-3.5 rounded-xl text-[14px] font-medium active:bg-[#FFF0F5] transition-colors disabled:opacity-50"
              >
                {isTestingMemory ? (
                  <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <Globe size={16} strokeWidth={2} className="text-gray-500" /> 
                )}
                {isTestingMemory ? '测试中...' : '测试连接'}
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 bg-[#F5F5F5] text-gray-800 py-3.5 rounded-xl text-[14px] font-medium active:bg-gray-200 transition-colors"
              >
                保存配置
              </button>
            </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Clear Data Confirm Modal */}
        {showClearConfirm && (
          <div className="absolute inset-0 z-[70] flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setShowClearConfirm(false)}></div>
            <div className="bg-white rounded-2xl w-full max-w-[320px] p-6 relative z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center mb-5">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
                  <Trash2 size={26} className="text-red-500" strokeWidth={1.8} />
                </div>
                <h3 className="text-[17px] font-semibold text-gray-800 mb-2">确认清空所有数据？</h3>
                <p className="text-[13px] text-gray-400 text-center leading-relaxed">
                  此操作将删除所有聊天记录、角色、记忆、设置及浏览器缓存，且<span className="text-red-500 font-medium">不可恢复</span>。
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl text-[14px] font-medium active:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleClearAllData}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl text-[14px] font-medium active:bg-red-600 transition-colors"
                >
                  确认清空
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Data Management Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[28px] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-white/50 mb-6">
          <div className="px-5 py-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>
            </div>
            <div>
              <h3 className="text-[16px] font-medium text-gray-800">数据管理</h3>
              <p className="text-[12px] text-gray-400 mt-0.5">备份或恢复全部本地数据</p>
            </div>
          </div>
          <div className="px-5 pb-5 flex gap-3 border-t border-gray-100/50 pt-4 flex-wrap">
            <button
              onClick={handleExport}
              className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 py-3.5 rounded-xl text-[14px] font-medium active:bg-gray-50 transition-colors shadow-sm"
            >
              <Download size={16} strokeWidth={2} className="text-green-500" />
              导出数据
            </button>
            <button
              onClick={handleImport}
              className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 py-3.5 rounded-xl text-[14px] font-medium active:bg-gray-50 transition-colors shadow-sm"
            >
              <Upload size={16} strokeWidth={2} className="text-blue-500" />
              导入数据
            </button>
          </div>
          <div className="px-5 pb-5">
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full flex items-center justify-center gap-2 bg-red-50 border border-red-100 text-red-500 py-3.5 rounded-xl text-[14px] font-medium active:bg-red-100 transition-colors"
            >
              <Trash2 size={16} strokeWidth={2} />
              清空数据
            </button>
          </div>
          <input
            ref={importFileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>

      </div>
    </motion.div>
  );
};
