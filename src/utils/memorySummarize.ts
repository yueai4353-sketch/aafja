/**
 * memorySummarize.ts
 * 
 * 记忆总结模块 —— 完全独立的提示词，不混入正常聊天提示词，避免 token 浪费。
 * 主要功能：
 *  1. 构建 AI 人设信息
 *  2. 构建用户（我）的人设信息
 *  3. 处理世界书
 *  4. 角色扮演最高指令 + 记忆提取任务
 *  5. 调用 LLM 并解析结果，写入情节记忆 & 了解你条目
 */

import { AppDB } from '../db';
import { saveAboutYouEntries, loadAboutYouEntries, savePlotMemories, loadPlotMemories } from '../db/youandme';
import type { AboutYouEntry, PlotMemoryEntry } from '../db/youandme';

// ========================
// 类型定义
// ========================
export interface SummarizeResult {
  plotMemories: PlotMemoryEntry[];
  aboutYouEntries: AboutYouEntry[];
  rawResponse: string;
  error?: string;
}

// ========================
// 提示词构建
// ========================

function buildAIPersonaSection(persona: any): string {
  if (!persona) return '';

  const wechatInfo = `【你的微信外壳信息】
微信昵称：${persona.wechatName || persona.name}
微信号：${persona.wechatId || '未设置'}
个性签名：${persona.signature || '未设置'}`;

  let coreInfo = '';
  if (persona.mode === 'detailed') {
    coreInfo = `【你的真实内核信息】
真实姓名：${persona.name}
性别：${persona.gender || '未知'}
年龄：${persona.age || '未知'}
生日：${persona.birthday || '未知'}
身份：${persona.identity || '未知'}
性格：${persona.personality || '未知'}
外观：${persona.appearance || '未知'}
沟通风格：${persona.communication_style || '未知'}
生活习惯：${persona.lifestyle || '未知'}
成长经历：${persona.background || '未知'}
与对方的关系：${persona.relationship || '未设定'}
${persona.nsfw_info ? 'NSFW相关：' + persona.nsfw_info : ''}`;
  } else {
    coreInfo = `【你的真实内核信息】
真实姓名：${persona.name}
人设描述：${persona.bio || ''}`;
  }

  return `${wechatInfo}\n\n${coreInfo}`;
}

function buildUserPersonaSection(myProfile: any): string {
  if (!myProfile) return '';
  return `【与你聊天的用户的真实人设档案（绝对不要把对方当成你自己）】
真实姓名：${myProfile.real_name || myProfile.name || '未告知'}
性别：${myProfile.gender || '未知'}
年龄：${myProfile.age || '未知'}
生日：${myProfile.birthday || '未知'}
身份：${myProfile.identity || '未知'}
性格：${myProfile.personality || '未知'}
外观：${myProfile.appearance || '未知'}
沟通风格：${myProfile.communication_style || '未知'}
生活习惯：${myProfile.lifestyle || '未知'}
成长经历：${myProfile.background || '未知'}
${myProfile.nsfw ? 'NSFW相关：' + myProfile.nsfw : ''}`;
}

function buildWorldbookSection(persona: any, chatTexts: string): string {
  try {
    const savedBooks = localStorage.getItem('os_worldbooks');
    if (!savedBooks) return '';

    let books = JSON.parse(savedBooks);

    if (persona?.linked_worldbooks && Array.isArray(persona.linked_worldbooks) && persona.linked_worldbooks.length > 0) {
      books = books.filter((wb: any) => persona.linked_worldbooks.includes(wb.id));
    } else if (persona?.linkedWorldbooks && Array.isArray(persona.linkedWorldbooks) && persona.linkedWorldbooks.length > 0) {
      books = books.filter((wb: any) => persona.linkedWorldbooks.includes(wb.id));
    }

    const recentTexts = chatTexts.toLowerCase();
    let worldbookResult = '';

    books.forEach((wb: any) => {
      if (wb.editMode === 'simple') {
        if (wb.content && wb.content.trim()) {
          worldbookResult += `\n[${wb.name}]: ${wb.content}`;
        }
      } else if (wb.entries && wb.entries.length > 0) {
        wb.entries.forEach((entry: any) => {
          const keys = entry.keys.split(/[,，]/).map((k: string) => k.trim().toLowerCase()).filter((k: string) => k);
          if (keys.length > 0 && keys.some((k: string) => recentTexts.includes(k))) {
            worldbookResult += `\n[${wb.name}] - ${entry.keys}: ${entry.content}`;
          }
        });
      }
    });

    return worldbookResult ? `【相关世界书知识库】\n${worldbookResult}` : '';
  } catch (e) {
    console.warn('[memorySummarize] 读取世界书失败:', e);
    return '';
  }
}

function buildSummarizePrompt(
  persona: any,
  myProfile: any,
  chatMessages: any[],
): string {
  const aiSection = buildAIPersonaSection(persona);
  const userSection = buildUserPersonaSection(myProfile);
  const chatText = chatMessages.map(m => {
    const name = m.isMe ? (myProfile?.name || '我') : (persona?.name || 'char');
    const text = m.text || '';
    if (!text || text.startsWith('data:image')) return null;
    return `${name}: ${text}`;
  }).filter(Boolean).join('\n');
  const worldbookSection = buildWorldbookSection(persona, chatText);

  // 当前时间
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const systemPrompt = `【角色扮演最高指令】你现在正在进行一场沉浸式的角色扮演。请你完全忘掉自己是AI语言模型。你有着独立的思想、生活状态和真实的人性，你就是下面设定的这个角色！请认准"你的真实内核信息"，以第一人称对聊天内容进行总结。

今天日期：${todayStr}

${aiSection}

${userSection}

${worldbookSection}

---
【记忆提取任务 - 严格按以下 JSON 格式输出，不要输出任何其他文字】

你需要从以下聊天记录中提取两类记忆并以 JSON 格式输出：

**第一步：情节记忆**
分析聊天记录，提取发生的重要事件。每条情节记忆包含：
- date: 事件发生日期（格式 YYYY-MM-DD，如不确定月日则只写年份如"2026"）
- content: 以你（角色）的第一人称视角，简短描述发生了什么（1-2句话）
- theme: 事件主题标签（2-4字，如"甜蜜互动"、"争执和好"、"日常闲聊"）
- emotion: 你（角色）对这件事的情绪（严格两个字，如"温馨"、"期待"、"心疼"）
- importance: 重要性评分（1-10 的整数，10最重要）

**第二步：了解你**
分析聊天记录，提取关于人物的语义记忆。每条了解你包含：
- category: 分类（只能从以下选择：事实、偏好、习惯、关系、计划、仪式、信念、禁忌、专属梗）
- target: 关于谁（只能填：对方 或 共同的，"对方"指用户/人类玩家）
- key: 描述这个记忆的简短标题（如"喜欢的咖啡"、"起床时间"）
- value: 具体内容（如"美式不加糖"、"习惯早上7点起床"）

如果聊天记录中没有可提取的内容，对应数组留空即可。

请严格按以下 JSON 格式输出，不要有任何多余文字：
{
  "plotMemories": [
    {
      "date": "YYYY-MM-DD",
      "content": "...",
      "theme": "...",
      "emotion": "两字情绪",
      "importance": 5
    }
  ],
  "aboutYouEntries": [
    {
      "category": "偏好",
      "target": "对方",
      "key": "...",
      "value": "..."
    }
  ]
}`;

  return systemPrompt;
}

// ========================
// 主函数：总结一批聊天记录
// ========================

export async function summarizeChatBatch(
  messages: any[],
  persona: any,
  myProfile: any,
): Promise<SummarizeResult> {
  const result: SummarizeResult = {
    plotMemories: [],
    aboutYouEntries: [],
    rawResponse: '',
  };

  try {
    // 优先读取记忆专用 API 配置，若未填写则回退到主 API 配置
    const memoryApiUrl = (localStorage.getItem('os_memory_api_url') || '').trim();
    const memoryApiKey = (localStorage.getItem('os_memory_api_key') || '').trim();
    const memoryApiModel = (localStorage.getItem('os_memory_api_model') || '').trim();

    const mainApiUrl = (localStorage.getItem('os_api_url') || '').trim();
    const mainApiKey = (localStorage.getItem('os_api_key') || '').trim();
    const mainApiModel = (localStorage.getItem('os_api_model') || '').trim();

    const apiUrl = memoryApiUrl || mainApiUrl;
    const apiKey = memoryApiKey || mainApiKey;
    const model = memoryApiModel || mainApiModel;

    if (!apiUrl || !apiKey || !model) {
      result.error = '未配置 API，请先在设置中填写 API URL、Key 和模型';
      return result;
    }

    // 构建系统提示词（独立提示词，不混入聊天提示词）
    const systemPrompt = buildSummarizePrompt(persona, myProfile, messages);

    // 构建用户消息（纯聊天记录文本）
    const chatText = messages.map(m => {
      const name = m.isMe ? (myProfile?.name || '我') : (persona?.name || 'char');
      const text = m.text || '';
      if (!text || text.startsWith('data:image')) return null;
      return `${name}: ${text}`;
    }).filter(Boolean).join('\n');

    const userMessage = `以下是需要总结的聊天记录：\n\n${chatText}\n\n请按要求提取情节记忆和了解你条目，以 JSON 格式输出。`;

    // 构建 API endpoint
    let baseUrl = apiUrl;
    if (baseUrl.endsWith('/chat/completions')) {
      baseUrl = baseUrl.replace('/chat/completions', '');
    }
    const endpoint = baseUrl.endsWith('/') ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      result.error = `API 请求失败: ${response.status} ${errorText.slice(0, 200)}`;
      return result;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    result.rawResponse = content;

    // 解析 JSON 结果
    let parsed: any = {};
    try {
      // 尝试提取 JSON 块（防止模型多输出了文字）
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(content);
      }
    } catch (e) {
      result.error = `JSON 解析失败: ${e}`;
      return result;
    }

    // ===== 处理情节记忆 =====
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (Array.isArray(parsed.plotMemories)) {
      const existingPlot = loadPlotMemories();
      const newPlot: PlotMemoryEntry[] = parsed.plotMemories.map((item: any) => {
        const dateStr = item.date || todayStr;
        // 判断是否包含月份信息
        const hasMonth = /^\d{4}-\d{2}(-\d{2})?$/.test(dateStr);
        const year = dateStr.split('-')[0];
        const month = hasMonth && dateStr.split('-').length >= 2 ? dateStr.split('-')[1] : null;
        return {
          content: item.content || '',
          theme: item.theme || '手动记录',
          emotion: item.emotion || '',
          importance: String(item.importance ?? 5),
          date: dateStr,
          year,
          month,
          hasMonth,
          timestamp: Date.now() + Math.random(),
        } as PlotMemoryEntry;
      }).filter((e: PlotMemoryEntry) => e.content);

      const merged = [...newPlot, ...existingPlot];
      savePlotMemories(merged);
      result.plotMemories = newPlot;
    }

    // ===== 处理了解你条目 =====
    const VALID_CATEGORIES = ['事实', '偏好', '习惯', '关系', '计划', '仪式', '信念', '禁忌', '专属梗'];
    const VALID_TARGETS = ['对方', '共同的'];

    if (Array.isArray(parsed.aboutYouEntries)) {
      const existingAboutYou = loadAboutYouEntries();
      const newEntries: AboutYouEntry[] = parsed.aboutYouEntries.map((item: any) => {
        return {
          id: Date.now() + Math.floor(Math.random() * 100000),
          category: VALID_CATEGORIES.includes(item.category) ? item.category : '事实',
          target: VALID_TARGETS.includes(item.target) ? item.target : '对方',
          key: item.key || '',
          value: item.value || '',
          createdAt: todayStr,
        } as AboutYouEntry;
      }).filter((e: AboutYouEntry) => e.key && e.value);

      const merged = [...newEntries, ...existingAboutYou];
      saveAboutYouEntries(merged);
      result.aboutYouEntries = newEntries;
    }

    return result;
  } catch (e: any) {
    result.error = `总结失败: ${e?.message || String(e)}`;
    return result;
  }
}
