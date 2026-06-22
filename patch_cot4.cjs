const fs = require('fs');
const path = 'c:/Users/86166/Desktop/fhjl/src/apps/WechatApp.tsx';
let c = fs.readFileSync(path, 'utf8');
const nl = '\r\n';

const i34 = '                                  ';   // 34 spaces
const i35 = '                                   ';  // 35 spaces
const i37 = '                                     '; // 37 spaces
const i39 = '                                       '; // 39 spaces
const i40 = '                                        '; // 40 spaces

// 精确搜索
const search =
  i34 + 'const showDot = showMindCardSetting && idx === lastAiMsgIdx && extractedMindCard && isLastGroup && pIdx === group.parts.length - 1;' + nl +
  i34 + 'return (' + nl +
  i37 + '<div ';

const replace =
  i34 + 'const showDot = showMindCardSetting && idx === lastAiMsgIdx && extractedMindCard && isLastGroup && pIdx === group.parts.length - 1;' + nl +
  i34 + 'const showCotBubble = !msg.isMe && isCotMsg && isLastGroup && pIdx === group.parts.length - 1;' + nl +
  i34 + 'return (' + nl +
  i37 + '<>' + nl +
  i37 + '{showCotBubble && (' + nl +
  i39 + '<button' + nl +
  i40 + 'onClick={() => setViewingCotContent(lastAiCotContent)}' + nl +
  i40 + 'className="flex items-center gap-1 px-2.5 py-1 bg-white rounded-[14px] text-[12px] text-gray-400 active:bg-gray-100 transition-colors shadow-sm border border-gray-100 select-none mb-1 self-start"' + nl +
  i39 + '>' + nl +
  i40 + '<span className="text-[10px]">▷</span>' + nl +
  i40 + '<span className="text-[10px] opacity-60">↺</span>' + nl +
  i40 + '<span>思维链</span>' + nl +
  i39 + '</button>' + nl +
  i37 + ')}' + nl +
  i37 + '<div ';

if (c.includes(search)) {
  c = c.replace(search, replace);
  console.log('✓ 插入思维链小气泡');

  // 闭合 </>：在 return 的最后 </div> 后加 </>
  // 原来结构：
  //                                   );       ← i34 + ');'
  //                               })}          ← 31 spaces + '})}'
  //                               {quoteInfo   ← 31 spaces + '{quoteInfo...'
  const i31 = '                               ';
  const closeSearch =
    i34 + ');' + nl +
    i31 + '})}' + nl +
    i31 + '{quoteInfo && gIdx === groups.length - 1 && (';
  const closeReplace =
    i37 + '</>' + nl +
    i34 + ');' + nl +
    i31 + '})}' + nl +
    i31 + '{quoteInfo && gIdx === groups.length - 1 && (';

  if (c.includes(closeSearch)) {
    c = c.replace(closeSearch, closeReplace);
    console.log('✓ 补上 </> 闭合');
  } else {
    console.log('✗ 未找到 </> 闭合位置');
    const idx2 = c.indexOf(i31 + '{quoteInfo && gIdx === groups.length - 1');
    console.log('附近:', JSON.stringify(c.substring(idx2 - 80, idx2 + 60)));
  }
} else {
  console.log('✗ 未找到 showDot 目标位置');
  const idx = c.indexOf('const showDot = showMindCardSetting && idx === lastAiMsgIdx && extractedMindCard && isLastGroup && pIdx');
  console.log('实际:', JSON.stringify(c.substring(idx - 2, idx + 220)));
}

fs.writeFileSync(path, c, 'utf8');
console.log('done');
