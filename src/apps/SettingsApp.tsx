import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Moon, Signal, Wifi, Battery, ChevronLeft, Plus, Globe } from 'lucide-react';
import { CurrentTime } from '../components';

const API_PRESETS = [
  { id: '', name: '-- 选择预设快速填充 --', url: '' },
  { id: 'openai', name: 'OpenAI', url: 'https://api.openai.com/v1' },
  { id: 'gemini', name: 'Google Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  { id: 'zhipu', name: '智谱 AI', url: 'https://open.bigmodel.cn/api/paas/v4' },
  { id: 'volcengine', name: '火山引擎', url: 'https://ark.cn-beijing.volces.com/api/v3' },
  { id: 'deepseek', name: 'DeepSeek', url: 'https://api.deepseek.com/v1' }
];

export const SettingsApp = ({ onBack, key }: { onBack: () => void, key?: React.Key }) => {
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

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 15 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 bg-white z-[60] flex flex-col pt-4"
    >
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

      {/* Settings Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 shrink-0 mt-2">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-800 active:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft size={24} strokeWidth={2} />
        </button>
        <span className="text-[17px] font-medium text-gray-800 absolute left-1/2 -translate-x-1/2">设置</span>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar bg-[#FAFAFA] p-4">
        <div className="bg-white rounded-[24px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-100/50 pb-6">
          {/* Section Header */}
          <div className="bg-gray-50/80 px-5 py-4 border-b border-gray-100/50">
            <h2 className="text-[15px] font-medium text-gray-800 tracking-wide">AI模型配置</h2>
          </div>

          <div className="px-5 pt-6 flex flex-col gap-6">
            {/* Presets Box */}
            <div className="bg-gray-50/50 rounded-[16px] p-4 border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <label className="text-[14px] font-medium text-gray-800">配置预设</label>
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
                  className="bg-white border border-gray-200 rounded-xl px-4 text-[14px] text-gray-700 active:bg-gray-50 transition-colors whitespace-nowrap font-light"
                >
                  管理
                </button>
              </div>
              <p className="text-[12px] text-gray-400 mt-3 text-center font-light leading-relaxed">
                选择预设会填充下方配置，需点击「保存配置」才生效
              </p>
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
              <div className="relative">
                <select 
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={models.length === 0}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#FFF0F5]/80 focus:border-[#fce4ec] transition-all font-light disabled:bg-gray-50 disabled:text-gray-400"
                >
                  {models.length === 0 ? (
                    <option value="">-- 请先测试连接以加载模型 --</option>
                  ) : (
                    models.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))
                  )}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
                </div>
              </div>
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
        </div>
      </div>
    </motion.div>
  );
};
