import { AppDB } from '../db';

/**
 * 检查指定联系人是否停用了AI时间感知
 * @param {string} contactId 
 * @returns {Promise<boolean>}
 */
export async function isTimeAwarenessDisabled(contactId: string): Promise<boolean> {
  if (!contactId) return false;
  try {
    const record = await AppDB.appSettings.get(`chat_settings_${contactId}`);
    return !!(record?.value?.disableTimeAwareness);
  } catch (e) {
    console.error('Failed to get time awareness setting:', e);
    return false;
  }
}

// 挂载到 window 全局对象
if (typeof window !== 'undefined') {
  (window as any).isTimeAwarenessDisabled = isTimeAwarenessDisabled;
}

/**
 * 构建纯净对话历史（不含时间间隔标记）
 * 当时间感知停用时替代 buildConversationWithTimeGaps 使用
 */
export function buildConversationPlain(messages: any[]) {
  return messages.map(msg => {
    const content = msg.text || msg.content || msg.messageText || '';
    const role = msg.isSelf ? 'user' : (msg.role || 'assistant');
    
    const resultMsg: any = {
      role: role === 'user' ? 'user' : 'assistant',
      content: content
    };
    
    if (msg.imageUrl) {
      resultMsg.imageUrl = msg.imageUrl;
    }
    
    return resultMsg;
  });
}

// 挂载到 window 全局对象
if (typeof window !== 'undefined') {
  (window as any).buildConversationPlain = buildConversationPlain;
}

/**
 * 时间感知停用覆盖指令（各路径统一使用）
 */
export const TIME_AWARENESS_OVERRIDE = '【系统覆盖指令】忽略上下文中所有与时间相关的信息（日期、时段、间隔、时间锚点等）。不要在回复中主动提及或推断当前时间、日期、时段，也不要根据时间流逝改变状态。直接基于上一条对话内容自然续接即可。';

// 挂载到 window 全局对象
if (typeof window !== 'undefined') {
  (window as any).TIME_AWARENESS_OVERRIDE = TIME_AWARENESS_OVERRIDE;
}

/**
 * 当时间感知停用时，后处理 systemPrompt 移除硬编码的时间相关文本
 * 不修改原始模板，只在运行时对已生成的字符串做正则替换
 */
export function stripTimeAwarenessFromPrompt(prompt: string): string {
    if (!prompt) return prompt;
    let s = prompt;

    // A: 时间锚点整块（══ 包裹的时间上下文 + ⚠️ 请基于【时间】...）
    s = s.replace(/══+\n[\s\S]*?══+\n⚠️ 请基于【时间】[^\n]*\n══+\n\n?/g, '');

    // B: "- 时间感知：牢记【时间】中的日期和时段..." 行
    s = s.replace(/- 时间感知：牢记【时间】[^\n]*\n?/g, '');

    // C: "N. 【时间】和对话历史 - 时间推进、状态演变" 行
    s = s.replace(/\d+\.\s*【时间】和对话历史[^\n]*\n?/g, '');

    // D: "0️⃣ 确认时间（首要）" 整块至 "1️⃣" 之前
    s = s.replace(/0️⃣\s*确认时间[^\n]*\n[\s\S]*?(?=1️⃣)/g, '');

    // E: "3️⃣ 意识到时间和关系的变化" 整块至 "4️⃣" 之前
    s = s.replace(/3️⃣\s*意识到时间和关系的变化[^\n]*\n[\s\S]*?(?=4️⃣)/g, '');

    // F: "【当前时间】\n..." 标签及其值行（电话路径）
    s = s.replace(/【当前时间】\n[^\n]*/g, '');

    // G: "【时间信息】...⚠️ 请严格依据..." 块（线下模板）
    s = s.replace(/【时间信息】\n[\s\S]*?⚠️ 请严格依据上方【现在】[^\n]*\n?/g, '');

    // H: "综合...【时间信息】..." → 移除 "【时间信息】"
    s = s.replace(/综合【你是谁】【时间信息】【当前情境】/g, '综合【你是谁】【当前情境】');

    // I: 整个【时间与状态演变】块（标题 + 所有 - 开头的行）
    s = s.replace(/【时间与状态演变】\n(?:- [^\n]*\n)*/g, '');

    // J: "⏰ 当前精确时间：..." 行（主动消息）
    s = s.replace(/⏰ 当前精确时间：[^\n]*\n?/g, '');

    // K: "⚠️ 时间约束（必须遵守）" 块（标题 + 所有 - 开头的行）
    s = s.replace(/⚠️ 时间约束（必须遵守）[：:]\n(?:- [^\n]*\n)*/g, '');

    // L: "在「...」这个时刻，你在做什么？" 句型
    s = s.replace(/在「[^」]*」这个时刻，你在做什么？\n?/g, '');

    // M: "- 在「...」这个时间点，..." 句型
    s = s.replace(/- 在「[^」]*」这个时间点，[^\n]*/g, '');

    // N: 主动消息对话状态中的时间行
    s = s.replace(/- 对方上次发消息：[^\n]*\n?/g, '');
    s = s.replace(/- 你上次回复：[^\n]*\n?/g, '');

    // O: 生活延续中的时间引导
    s = s.replace(/距上次仅过去\d+分钟[^\n]*/g, '');
    s = s.replace(/过去了\d+分钟[^\n]*/g, '');
    s = s.replace(/已经过去[^\n]*生活有了明显推进[^\n]*/g, '');

    // P: "- 不要重复上一次的场景（时间在流动）"
    s = s.replace(/- 不要重复上一次的场景（时间在流动）\n?/g, '');

    // Q: 清理多余空行
    s = s.replace(/\n{4,}/g, '\n\n\n');

    return s;
}

// 挂载到 window 全局对象
if (typeof window !== 'undefined') {
  (window as any).stripTimeAwarenessFromPrompt = stripTimeAwarenessFromPrompt;
}
