const fs = require('fs');
const path = 'c:/Users/86166/Desktop/fhjl/src/apps/WechatApp.tsx';
let c = fs.readFileSync(path, 'utf8');

// 文件使用 \r\n 行尾
const nl = '\r\n';

const search = 
  '                {groups.map((group, gIdx) => {' + nl +
  '                    const isLastGroup = gIdx === groups.length - 1;' + nl +
  '                    if (group.type === \'narrator\') {' + nl +
  '                        const pIdx = 0;' + nl +
  '                        const showDot = showMindCardSetting && idx === lastAiMsgIdx && extractedMindCard && isLastGroup;';

const cotBubble = 
  '                {/* 思维链小气泡入口 */}' + nl +
  '                {isCotMsg && (' + nl +
  '                  <div className="flex items-center gap-3 w-full my-1">' + nl +
  '                    <div className="w-10 h-10 bg-gray-200 rounded-[6px] flex items-center justify-center overflow-hidden shrink-0">' + nl +
  '                      {friend.avatar ? <img src={friend.avatar} alt="" className="w-full h-full object-cover" /> : <User size={20} className="text-gray-400" />}' + nl +
  '                    </div>' + nl +
  '                    <button' + nl +
  '                      onClick={() => setViewingCotContent(lastAiCotContent)}' + nl +
  '                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-[10px] text-[13px] text-gray-500 active:bg-gray-100 transition-colors shadow-sm border border-gray-100/80 select-none"' + nl +
  '                    >' + nl +
  '                      <span className="text-[11px]">\u25b7</span>' + nl +
  '                      <span className="text-[11px] opacity-60">\u21ba</span>' + nl +
  '                      <span>\u601d\u7ef4\u94fe</span>' + nl +
  '                    </button>' + nl +
  '                  </div>' + nl +
  '                )}' + nl +
  '' + nl;

const replace = cotBubble +
  '                {groups.map((group, gIdx) => {' + nl +
  '                    const isLastGroup = gIdx === groups.length - 1;' + nl +
  '                    if (group.type === \'narrator\') {' + nl +
  '                        const pIdx = 0;' + nl +
  '                        const showDot = showMindCardSetting && idx === lastAiMsgIdx && extractedMindCard && isLastGroup;';

if (c.includes(search)) {
  c = c.replace(search, replace);
  fs.writeFileSync(path, c, 'utf8');
  console.log('OK - 思维链小气泡已插入');
} else {
  console.log('NOT FOUND');
  // 调试：打印实际文本
  const idx = c.indexOf('groups.map((group, gIdx)');
  console.log('actual around groups.map:', JSON.stringify(c.substring(idx - 50, idx + 200)));
}
