const fs = require('fs');
const path = 'c:/Users/86166/Desktop/fhjl/src/apps/WechatApp.tsx';
let c = fs.readFileSync(path, 'utf8');
const nl = '\r\n';

let changes = 0;

// ── 1. 删掉独立行的思维链气泡（气泡独立行，带头像）──────────────────────────
const search1 =
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
  '                      <span className="text-[11px]">▷</span>' + nl +
  '                      <span className="text-[11px] opacity-60">↺</span>' + nl +
  '                      <span>思维链</span>' + nl +
  '                    </button>' + nl +
  '                  </div>' + nl +
  '                )}' + nl +
  '' + nl;

if (c.includes(search1)) {
  c = c.replace(search1, '');
  changes++;
  console.log('✓ 1. 删掉独立行气泡');
} else {
  console.log('✗ 1. 未找到独立行气泡');
}

// ── 2. isCotMsg 条件改为 useCoT ──────────────────────────────────────────────
const search2 = 'const isCotMsg = showCotDisplaySetting && !msg.isMe && idx === lastAiCotMsgIdx && lastAiCotContent;';
const replace2 = 'const isCotMsg = useCoTSetting && !msg.isMe && idx === lastAiCotMsgIdx && lastAiCotContent;';
if (c.includes(search2)) {
  c = c.replace(search2, replace2);
  changes++;
  console.log('✓ 2. isCotMsg 条件改为 useCoTSetting');
} else {
  console.log('✗ 2. 未找到 isCotMsg 定义');
}

// ── 3. 在 text 气泡内部最后一个 part，气泡 div 上方插入小气泡 ────────────────
// 找到 group.parts.map 里的 showDot 计算行，在气泡 div 前插入思维链小气泡
const search3 =
  '                                   const showDot = showMindCardSetting && idx === lastAiMsgIdx && extractedMindCard && isLastGroup && pIdx === group.parts.length - 1;' + nl +
  '                                   return (' + nl +
  '                                      <div ';

const replace3 =
  '                                   const showDot = showMindCardSetting && idx === lastAiMsgIdx && extractedMindCard && isLastGroup && pIdx === group.parts.length - 1;' + nl +
  '                                   const showCotBubble = !msg.isMe && isCotMsg && isLastGroup && pIdx === group.parts.length - 1;' + nl +
  '                                   return (' + nl +
  '                                      <>' + nl +
  '                                      {showCotBubble && (' + nl +
  '                                        <button' + nl +
  '                                          onClick={() => setViewingCotContent(lastAiCotContent)}' + nl +
  '                                          className="flex items-center gap-1 px-2.5 py-1 bg-white rounded-[14px] text-[12px] text-gray-400 active:bg-gray-100 transition-colors shadow-sm border border-gray-100 select-none mb-1 self-start"' + nl +
  '                                        >' + nl +
  '                                          <span className="text-[10px]">▷</span>' + nl +
  '                                          <span className="text-[10px] opacity-60">↺</span>' + nl +
  '                                          <span>思维链</span>' + nl +
  '                                        </button>' + nl +
  '                                      )}' + nl +
  '                                      <div ';

if (c.includes(search3)) {
  // 同时需要把对应的 </div> 关闭改成 </div></>
  // 先替换开头
  const closeSearch = 
    '                                   );' + nl +
    '                                })}' + nl +
    '                                {quoteInfo && gIdx === groups.length - 1 && (';
  const closeReplace =
    '                                      </>' + nl +
    '                                   );' + nl +
    '                                })}' + nl +
    '                                {quoteInfo && gIdx === groups.length - 1 && (';

  c = c.replace(search3, replace3);
  if (c.includes(closeSearch)) {
    c = c.replace(closeSearch, closeReplace);
    changes++;
    console.log('✓ 3. 在气泡上方插入小气泡');
  } else {
    console.log('? 3a. 插入小气泡成功，但未找到 </> 关闭位置（需手动修复）');
    changes++;
  }
} else {
  console.log('✗ 3. 未找到 showDot 位置');
}

// ── 4. 删掉"思维连"独立设置卡片 ──────────────────────────────────────────────
const search4 =
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

if (c.includes(search4)) {
  c = c.replace(search4, '');
  changes++;
  console.log('✓ 4. 删掉思维连独立卡片');
} else {
  console.log('✗ 4. 未找到思维连独立卡片');
}

// ── 5. ChatScreen 里把 showCotDisplaySetting 改名引用（读取 useCoT setting）──
// 找到 ChatScreen 里读取 showCotDisplay 的地方
const search5 = "if (record.value.showCotDisplay !== undefined) setShowCotDisplaySetting(record.value.showCotDisplay);";
const replace5 = "if (record.value.useCoT !== undefined) setUseCoTSetting(record.value.useCoT);";
if (c.includes(search5)) {
  c = c.replace(search5, replace5);
  changes++;
  console.log('✓ 5. ChatScreen 读取 useCoT 替代 showCotDisplay');
} else {
  console.log('~ 5. 未找到 showCotDisplay 读取，检查实际值');
}

// ── 6. 把 ChatScreen 的 state 声明从 showCotDisplaySetting 改为 useCoTSetting──
const search6 = 'const [showCotDisplaySetting, setShowCotDisplaySetting] = useState(false);';
const replace6 = 'const [useCoTSetting, setUseCoTSetting] = useState(false);';
if (c.includes(search6)) {
  c = c.replace(search6, replace6);
  changes++;
  console.log('✓ 6. state 声明改名');
} else {
  console.log('~ 6. 未找到 showCotDisplaySetting state 声明');
}

fs.writeFileSync(path, c, 'utf8');
console.log(`\n完成，共 ${changes} 处修改`);
