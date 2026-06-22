const fs = require('fs');
const path = 'c:/Users/86166/Desktop/fhjl/src/apps/WechatApp.tsx';
let c = fs.readFileSync(path, 'utf8');

const search = '                {groups.map((group, gIdx) => {\n                    const isLastGroup = gIdx === groups.length - 1;\n                    if (group.type === \'narrator\') {\n                        const pIdx = 0;\n                        const showDot = showMindCardSetting && idx === lastAiMsgIdx && extractedMindCard && isLastGroup;';

const cotBubble = `                {/* 思维链小气泡入口 */}
                {isCotMsg && (
                  <div className="flex items-center gap-3 w-full my-1">
                    <div className="w-10 h-10 bg-gray-200 rounded-[6px] flex items-center justify-center overflow-hidden shrink-0">
                      {friend.avatar ? <img src={friend.avatar} alt="" className="w-full h-full object-cover" /> : <User size={20} className="text-gray-400" />}
                    </div>
                    <button
                      onClick={() => setViewingCotContent(lastAiCotContent)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-[10px] text-[13px] text-gray-500 active:bg-gray-100 transition-colors shadow-sm border border-gray-100/80 select-none"
                    >
                      <span className="text-[11px]">▷</span>
                      <span className="text-[11px] opacity-60">↺</span>
                      <span>思维链</span>
                    </button>
                  </div>
                )}

`;

const replace = cotBubble + '                {groups.map((group, gIdx) => {\n                    const isLastGroup = gIdx === groups.length - 1;\n                    if (group.type === \'narrator\') {\n                        const pIdx = 0;\n                        const showDot = showMindCardSetting && idx === lastAiMsgIdx && extractedMindCard && isLastGroup;';

if (c.includes(search)) {
  c = c.replace(search, replace);
  fs.writeFileSync(path, c, 'utf8');
  console.log('OK - 思维链小气泡已插入');
} else {
  console.log('NOT FOUND - 请检查搜索文本');
}
