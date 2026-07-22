import React from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[80] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose}></div>
      <div className="bg-white rounded-2xl w-full max-w-[320px] p-6 relative z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto">
        {/* Title */}
        <h3 className="text-[16px] font-bold text-gray-800 mb-5 text-center">春锦梨</h3>

        {/* Menu Items - All expanded by default */}
        <div className="space-y-3">
          {/* 正版声明 */}
          <div>
            <div className="flex items-center gap-3 px-4 py-3.5 bg-gray-50 rounded-xl text-left">
              <span className="text-[18px]">📢</span>
              <span className="text-[14px] font-medium text-gray-700">声明</span>
            </div>
            <div className="mt-2 px-4 py-3 bg-gray-50 rounded-xl text-[13px] text-gray-600 leading-relaxed space-y-2">
              <p>春锦梨既不付费也不免费，属于私人小手机、禁止出现在互联网上！</p>
              <p>价格为9999999999999999999</p>
              <p>能玩上的说明你得到主人的认可了！</p>
              <p>使用先去看主页的功能介绍app！！！！！！！</p>
            </div>
          </div>

          {/* 免责声明 */}
          <div>
            <div className="flex items-center gap-3 px-4 py-3.5 bg-gray-50 rounded-xl text-left">
              <span className="text-[18px]">⚖️</span>
              <span className="text-[14px] font-medium text-gray-700">免责声明</span>
            </div>
            <div className="mt-2 px-4 py-3 bg-gray-50 rounded-xl text-[13px] text-gray-600 leading-relaxed space-y-2">
              <p>本产品仅供娱乐使用，AI 生成的内容不代表开发者立场。</p>
              <p>本产品所有内容仅限分享给江明礼的妈妈</p>
              <p>用户应自行判断 AI 回复内容的真实性和适当性，限制级内容自己偷着乐。</p>
              <p>使用本产品即表示您同意以上条款。</p>
            </div>
          </div>

          {/* 更新日志 */}
          <div className="flex items-center gap-3 px-4 py-3.5 bg-gray-50 rounded-xl text-left">
            <span className="text-[18px]">🔄</span>
            <span className="text-[14px] font-medium text-gray-700">更新日志</span>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-5 py-3 bg-gray-800 text-white rounded-xl text-[14px] font-medium active:bg-gray-900 transition-colors"
        >
          我知道了
        </button>
      </div>
    </div>
  );
};
