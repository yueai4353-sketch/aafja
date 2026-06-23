/**
 * 你我之间 - 专用数据存储
 * 使用 localStorage 持久化，key 前缀统一为 "youandme_"
 */

export interface ScheduleItem {
  date: string;  // 如 '2026.6.23'
  time: string;  // 如 '08:00'
  text: string;  // 事项描述
}

const KEY_MY_SCHEDULE = 'youandme_my_schedule';
const KEY_OTHER_SCHEDULE = 'youandme_other_schedule';
const KEY_SELECTED_PERSONA = 'youandme_selected_persona_id';

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
