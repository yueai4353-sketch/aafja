/**
 * 你我之间 - 专用数据存储
 * 使用 localStorage 持久化，key 前缀统一为 "youandme_"
 */

export interface ScheduleItem {
  date: string;  // 如 '2026.6.23'
  time: string;  // 如 '08:00'
  text: string;  // 事项描述
}

/**
 * 选中人设的精简快照（只保留接电话提示词需要的字段，节省存储和 token）
 */
export interface PersonaSnapshot {
  id: string;
  name: string;
  // 简单模式
  bio?: string;
  // 详细模式
  mode?: string;
  gender?: string;
  age?: string;
  birthday?: string;
  identity?: string;
  personality?: string;
  appearance?: string;
  relationship?: string;
  communication_style?: string;
  lifestyle?: string;
  background?: string;
  nsfw_info?: string;
}

const KEY_MY_SCHEDULE      = 'youandme_my_schedule';
const KEY_OTHER_SCHEDULE   = 'youandme_other_schedule';
const KEY_SELECTED_PERSONA = 'youandme_selected_persona_id';
const KEY_PERSONA_SNAPSHOT = 'youandme_persona_snapshot';

// ---- 我的日程 ----
export function loadMySchedule(): ScheduleItem[] {
  try {
    const raw = localStorage.getItem(KEY_MY_SCHEDULE);
    return raw ? (JSON.parse(raw) as ScheduleItem[]) : [];
  } catch {
    return [];
  }
}

export function saveMySchedule(items: ScheduleItem[]): void {
  localStorage.setItem(KEY_MY_SCHEDULE, JSON.stringify(items));
}

// ---- 对方日程 ----
export function loadOtherSchedule(): ScheduleItem[] {
  try {
    const raw = localStorage.getItem(KEY_OTHER_SCHEDULE);
    return raw ? (JSON.parse(raw) as ScheduleItem[]) : [];
  } catch {
    return [];
  }
}

export function saveOtherSchedule(items: ScheduleItem[]): void {
  localStorage.setItem(KEY_OTHER_SCHEDULE, JSON.stringify(items));
}

// ---- 选中的人设 ID ----
export function loadSelectedPersonaId(): string | null {
  return localStorage.getItem(KEY_SELECTED_PERSONA);
}

export function saveSelectedPersonaId(id: string): void {
  localStorage.setItem(KEY_SELECTED_PERSONA, id);
}

// ---- 选中人设的快照（选角时保存，供接电话提示词读取，节省 token） ----
export function loadPersonaSnapshot(): PersonaSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY_PERSONA_SNAPSHOT);
    return raw ? (JSON.parse(raw) as PersonaSnapshot) : null;
  } catch {
    return null;
  }
}

export function savePersonaSnapshot(persona: any): void {
  if (!persona) return;
  const snapshot: PersonaSnapshot = {
    id: persona.id,
    name: persona.name,
    bio: persona.bio,
    mode: persona.mode,
    gender: persona.gender,
    age: persona.age,
    birthday: persona.birthday,
    identity: persona.identity,
    personality: persona.personality,
    appearance: persona.appearance,
    relationship: persona.relationship,
    communication_style: persona.communication_style,
    lifestyle: persona.lifestyle,
    background: persona.background,
    nsfw_info: persona.nsfw_info,
  };
  // 只保留有值的字段，减少存储体积
  (Object.keys(snapshot) as (keyof PersonaSnapshot)[]).forEach(k => {
    if (snapshot[k] === undefined || snapshot[k] === null || snapshot[k] === '') {
      delete snapshot[k];
    }
  });
  localStorage.setItem(KEY_PERSONA_SNAPSHOT, JSON.stringify(snapshot));
}

// ======= 记忆海数据持久化 =======

// --- 了解你 (AboutYouEntry) ---
export interface AboutYouEntry {
  id: number;
  category: string;
  target: string;
  key: string;
  value: string;
  createdAt: string;
}

const KEY_ABOUT_YOU_ENTRIES = 'memory_about_you_entries';

export function loadAboutYouEntries(): AboutYouEntry[] {
  try {
    const raw = localStorage.getItem(KEY_ABOUT_YOU_ENTRIES);
    return raw ? (JSON.parse(raw) as AboutYouEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveAboutYouEntries(entries: AboutYouEntry[]): void {
  localStorage.setItem(KEY_ABOUT_YOU_ENTRIES, JSON.stringify(entries));
}

// --- 情节记忆 (PlotMemoryEntry) ---
export interface PlotMemoryEntry {
  content: string;
  theme: string;
  emotion: string;
  importance: string;
  date: string;
  year: string;
  month: string | null;
  hasMonth: boolean;
  timestamp: number;
}

const KEY_PLOT_MEMORIES = 'memory_plot_memories';

export function loadPlotMemories(): PlotMemoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY_PLOT_MEMORIES);
    return raw ? (JSON.parse(raw) as PlotMemoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function savePlotMemories(memories: PlotMemoryEntry[]): void {
  localStorage.setItem(KEY_PLOT_MEMORIES, JSON.stringify(memories));
}

// ---- 工具函数：将日程数组序列化为紧凑文本（用于注入提示词） ----
export function scheduleItemsToText(items: ScheduleItem[]): string {
  return items
    .map(i => `${i.date ? i.date + '/' : ''}${i.time ? i.time + ' ' : ''}${i.text}`)
    .join('\n');
}
