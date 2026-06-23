import { AppDB } from '../db';

/**
 * 构建世界书内容
 * - 简单模式（editMode === 'simple'）：全量注入
 * - 条目模式：无聊天上下文时跳过（不触发关键词匹配）
 */
export function buildWorldbookText(persona: any): string {
  try {
    const saved = localStorage.getItem('os_worldbooks');
    if (!saved) return '';
    let books = JSON.parse(saved);
    // 按照人设绑定的世界书过滤
    const linked = persona?.linked_worldbooks || persona?.linkedWorldbooks;
    if (Array.isArray(linked)) {
      books = linked.length > 0 ? books.filter((b: any) => linked.includes(b.id)) : [];
    }
    return books
      .filter((b: any) => b.editMode === 'simple' && b.content?.trim())
      .map((b: any) => `[${b.name}]\n${b.content}`)
      .join('\n\n');
  } catch {
    return '';
  }
}

/**
 * 读取该人设最近的聊天记录（最多 30 条文字消息，用于判断是否已有日程安排）
 */
export async function buildRecentChatText(persona: any, myName: string): Promise<string> {
  if (!persona) return '';
  try {
    const msgs = await AppDB.messages
      .where('contactId').equals(persona.id)
      .reverse()
      .limit(30)
      .toArray();
    return msgs
      .reverse()
      .filter((m: any) => m.text && m.msgType !== 'system' && m.msgType !== 'narrator')
      .map((m: any) => `${m.isMe ? myName : persona.name}: ${m.text}`)
      .join('\n');
  } catch {
    return '';
  }
}

/**
 * 将人设（AI角色）的完整字段拼成文字摘要
 * 字段对齐 aiContext.ts 中 detailed 模式的输出
 */
export function buildPersonaText(persona: any): string {
  if (!persona) return '';
  if (persona.mode === 'detailed') {
    const lines = [
      `姓名：${persona.name || '未知'}`,
      `微信昵称：${persona.wechatName || persona.name || '未知'}`,
      `微信号：${persona.wechatId || persona.wechat_id || '未设置'}`,
      `个性签名：${persona.signature || '未设置'}`,
      `性别：${persona.gender || '未知'}`,
      `年龄：${persona.age || '未知'}`,
      `生日：${persona.birthday || '未知'}`,
      `身份：${persona.identity || '未知'}`,
      `昵称：${persona.nickname || '未设置'}`,
      `性格：${persona.personality || '未知'}`,
      `外观：${persona.appearance || '未知'}`,
      `与对方的关系：${persona.relationship || '未设定'}`,
      `沟通风格：${persona.communication_style || '未知'}`,
      `生活习惯：${persona.lifestyle || '未知'}`,
      `成长经历：${persona.background || '未知'}`,
    ];
    if (persona.nsfw_info || persona.nsfw) {
      lines.push(`NSFW相关：${persona.nsfw_info || persona.nsfw}`);
    }
    return lines.join('\n');
  }
  // 普通模式
  return [
    `姓名：${persona.name || '未知'}`,
    `微信昵称：${persona.wechatName || persona.name || '未知'}`,
    `人设描述：${persona.bio || '（无）'}`,
  ].join('\n');
}

/**
 * 将我的档案（myProfile）的完整字段拼成文字摘要
 * 字段对齐 aiContext.ts 中 userCoreInfo 的输出
 */
export function buildMyProfileText(myProfile: any): string {
  if (!myProfile) return '';
  const lines = [
    `姓名：${myProfile.real_name || myProfile.name || '未知'}`,
    `微信昵称：${myProfile.name || '未知'}`,
    `微信号：${myProfile.wechat_id || '未设置'}`,
    `个性签名：${myProfile.signature || '未设置'}`,
    `性别：${myProfile.gender || '未知'}`,
    `年龄：${myProfile.age || '未知'}`,
    `生日：${myProfile.birthday || '未知'}`,
    `身份：${myProfile.identity || '未知'}`,
    `昵称：${myProfile.nickname || '未设置'}`,
    `性格：${myProfile.personality || '未知'}`,
    `外观：${myProfile.appearance || '未知'}`,
    `沟通风格：${myProfile.communication_style || '未知'}`,
    `生活习惯：${myProfile.lifestyle || '未知'}`,
    `成长经历：${myProfile.background || '未知'}`,
  ];
  if (myProfile.nsfw) {
    lines.push(`NSFW相关：${myProfile.nsfw}`);
  }
  return lines.join('\n');
}

/**
 * 构建"我的日程"AI 提示词
 */
export function buildMySchedulePrompt(params: {
  myProfile: any;
  worldbook: string;
  recentChat: string;
  extraNote: string;
  now: Date;
  otherSchedule?: string; // 对方日程（联动时注入）
}): string {
  const { myProfile, worldbook, recentChat, extraNote, now, otherSchedule } = params;
  const dateStr = now.toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
  const myText = buildMyProfileText(myProfile);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  return `你现在是一个日程规划助手，请为用户（${myProfile?.real_name || myProfile?.name || '用户'}）生成今天（${dateStr}）的完整日程安排。

【用户档案】
${myText}

${worldbook ? `【世界书背景】\n${worldbook}\n\n` : ''}${recentChat ? `【最近聊天记录（用于判断是否已有日程提示）】\n${recentChat}\n\n` : ''}${otherSchedule ? `【对方（AI角色）今日日程（联动参考）】
${otherSchedule}

` : ''}【补充说明】
${extraNote.trim() || '（无，请自由发挥）'}

【任务要求】
1. 先检查聊天记录中用户是否提到了今天的计划（如"今天要去…""打算…""计划…"等）。若有，以此为基础编排；若没有，则根据用户的身份、性格、生活习惯自由合理生成。
2. 一天24小时合理规划，从起床到入睡，在什么时间点做什么事，内容要符合用户的人设。${otherSchedule ? `
3. 联动权重判断：综合用户档案、补充说明和聊天记录，自行评估两人关系亲密度和当天情境，决定与对方日程产生交集的时间点数量——关系越亲密、补充说明越明确、聊天中越有共同计划，联动时间点应越多；反之可以只有零星交集甚至完全独立。联动形式可以是共同出行、约定见面、同步作息等，要自然合理。
4. 每条日程格式严格为：${year}.${month}.${day}/HH:MM  事项描述（时间和事项之间用两个空格隔开）
5. 直接输出日程列表，不加任何解释、序号、前言或多余符号，每条日程独占一行。` : `
3. 每条日程格式严格为：${year}.${month}.${day}/HH:MM  事项描述（时间和事项之间用两个空格隔开）
4. 直接输出日程列表，不加任何解释、序号、前言或多余符号，每条日程独占一行。`}`;
}

/**
 * 构建"对方（AI 人设）日程"AI 提示词
 * - 读取 persona 完整档案（含世界书）
 * - 读取与该人设的聊天记录（判断是否已有日程提示）
 */
export function buildOtherSchedulePrompt(params: {
  persona: any;
  worldbook: string;
  recentChat: string;
  extraNote: string;
  now: Date;
  mySchedule?: string; // 我的日程（联动时注入）
}): string {
  const { persona, worldbook, recentChat, extraNote, now, mySchedule } = params;
  if (!persona) return '';
  const dateStr = now.toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
  const personaText = buildPersonaText(persona);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  return `你现在是一个日程规划助手，请为角色（${persona.name}）生成今天（${dateStr}）的完整日程安排。

【角色档案（花集人设）】
${personaText}

${worldbook ? `【绑定的世界书】\n${worldbook}\n\n` : ''}${recentChat ? `【最近聊天记录（用于判断是否已有日程提示）】\n${recentChat}\n\n` : ''}${mySchedule ? `【用户今日日程（联动参考）】
${mySchedule}

` : ''}【补充说明】
${extraNote.trim() || '（无，请自由发挥）'}

【任务要求】
1. 先检查聊天记录中是否提到了该角色今天的计划（如"今天要去…""我打算…""计划…"等）。若有，以此为基础编排；若没有，则根据角色的身份、性格、生活习惯自由合理生成。
2. 一天24小时合理规划，从起床到入睡，在什么时间点做什么事，内容要完全符合这个角色的设定。${mySchedule ? `
3. 联动权重判断：综合角色档案、补充说明和聊天记录，自行评估两人关系亲密度和当天情境，决定与用户日程产生交集的时间点数量——关系越亲密、补充说明越明确、聊天中越有共同计划，联动时间点应越多；反之可以只有零星交集甚至完全独立。联动形式可以是共同出行、约定见面、同步作息等，要自然合理且符合角色性格。
4. 每条日程格式严格为：${year}.${month}.${day}/HH:MM  事项描述（时间和事项之间用两个空格隔开）
5. 直接输出日程列表，不加任何解释、序号、前言或多余符号，每条日程独占一行。` : `
3. 每条日程格式严格为：${year}.${month}.${day}/HH:MM  事项描述（时间和事项之间用两个空格隔开）
4. 直接输出日程列表，不加任何解释、序号、前言或多余符号，每条日程独占一行。`}`;
}
