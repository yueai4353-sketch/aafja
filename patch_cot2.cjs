const fs = require('fs');
const path = 'c:/Users/86166/Desktop/fhjl/src/apps/WechatApp.tsx';
let c = fs.readFileSync(path, 'utf8');

const nl = '\r\n';

// 在 Cher心声 卡片的结束 </div> 后面插入"思维连"卡片
const search = 
  '             打开后，聊天界面 AI 回复的最后一条气泡右上方会出现粉色提示点，点击可查看 AI 真实心声和隐藏一面。' + nl +
  '           </p>' + nl +
  '        </div>';

const newCard =
  nl +
  '        <div className="bg-white border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] p-5 flex flex-col rounded-[12px] mt-2">' + nl +
  '           <div className="flex items-center justify-between">' + nl +
  '              <span className="text-[16px] text-[#333333] font-medium">思维连</span>' + nl +
  '              <ToggleSwitch checked={showCotDisplay} onChange={async (val) => { setShowCotDisplay(val); await updateSetting(\'showCotDisplay\', val); }} />' + nl +
  '           </div>' + nl +
  '           <textarea' + nl +
  '             value={cotDraft}' + nl +
  '             onChange={(e) => { setCotDraft(e.target.value); setSelectedCotPresetId(null); }}' + nl +
  '             onBlur={(e) => handleSetCoTStyle(e.target.value)}' + nl +
  '             placeholder="留空则使用默认。"' + nl +
  '             className="w-full h-[80px] border border-gray-200 rounded-[8px] p-3 text-[15px] text-[#333333] placeholder-gray-400 bg-[#fafafa] focus:outline-none focus:border-[#07C160] focus:bg-white transition-colors resize-none mt-4"' + nl +
  '           />' + nl +
  '           <div className="flex items-center justify-between mt-2">' + nl +
  '             <p className="text-[13px] text-[#999999] flex-1 pr-4">留空则使用默认。</p>' + nl +
  '             <button' + nl +
  '               onClick={() => { setCotDraft(\'\'); handleSetCoTStyle(\'\'); }}' + nl +
  '               className="px-3 py-1.5 border border-gray-200 text-[#666666] text-[13px] rounded-[6px] active:bg-gray-50 transition-colors shrink-0"' + nl +
  '             >' + nl +
  '               恢复默认' + nl +
  '             </button>' + nl +
  '           </div>' + nl +
  '        </div>';

const replace =
  '             打开后，聊天界面 AI 回复的最后一条气泡右上方会出现粉色提示点，点击可查看 AI 真实心声和隐藏一面。' + nl +
  '           </p>' + nl +
  '        </div>' + newCard;

if (c.includes(search)) {
  c = c.replace(search, replace);
  fs.writeFileSync(path, c, 'utf8');
  console.log('OK - 思维连卡片已插入');
} else {
  console.log('NOT FOUND');
  const idx = c.indexOf('打开后，聊天界面 AI 回复');
  console.log('actual:', JSON.stringify(c.substring(idx - 10, idx + 120)));
}
