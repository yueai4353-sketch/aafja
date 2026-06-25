/**
 * 我控道具管理器
 *
 * 激活的道具快照按 contactId 存储在 localStorage，
 * key: `wokong_active_${contactId}`
 * value: JSON 序列化的 ActiveRecord
 */

export interface WoKongItemSnapshot {
  name: string;
  emoji: string;
  appearance: string;       // shape
  charCognition: string;    // charKnowledge
  usage: string;
  buffEffect: string;       // buff
}

export interface WoKongActiveRecord {
  contactId: string;
  itemId: number;
  /** pending: 道具在场景中但效果未启动；active: 效果生效中 */
  state: 'pending' | 'active';
  itemSnapshot: WoKongItemSnapshot;
  deliveredAt: number;
  activatedAt: number | null;
  /** 退场剩余消息计数，null 表示非消息数模式 */
  msgCounterRemaining: number | null;
  /** 退场关键词命中次数 */
  endHitCounter: number;
  /** 触发关键词命中次数（pending 时使用） */
  triggerHitCounter: number;
  /** pending 状态下经过的消息数 */
  pendingMsgCounter: number;
}

const storageKey = (contactId: string) => `wokong_active_${contactId}`;

/** 激活一件道具，写入完整运行时记录 */
export function activateProp(
  contactId: string,
  snapshot: WoKongItemSnapshot,
  state: 'pending' | 'active' = 'pending',
  itemId: number = 0,
  exitMode: 'messages' | 'time' | 'keyword' = 'messages',
  exitMessages: number = 10,
) {
  const now = Date.now();
  const record: WoKongActiveRecord = {
    contactId,
    itemId,
    state,
    itemSnapshot: snapshot,
    deliveredAt: now,
    activatedAt: state === 'active' ? now : null,
    msgCounterRemaining: exitMode === 'messages' ? exitMessages : null,
    endHitCounter: 0,
    triggerHitCounter: 0,
    pendingMsgCounter: 0,
  };
  localStorage.setItem(storageKey(contactId), JSON.stringify(record));
}

/** 将状态切换为 active（效果生效） */
export function setActiveState(contactId: string) {
  const record = getActiveRecord(contactId);
  if (record) {
    record.state = 'active';
    localStorage.setItem(storageKey(contactId), JSON.stringify(record));
  }
}

/** 清除激活的道具 */
export function deactivateProp(contactId: string) {
  localStorage.removeItem(storageKey(contactId));
}

/**
 * 生成入场旁白文本。
 * 有自定义旁白用自定义，否则自动生成。
 */
export function buildEntryNarration(name: string, emoji: string, entryNarration?: string): string {
  if (entryNarration && entryNarration.trim()) return entryNarration.trim();
  return `[${emoji ? emoji + ' ' : ''}${name} 出现了]`;
}

/**
 * 生成退场旁白文本。
 */
export function buildExitNarration(name: string, exitNarration?: string): string {
  if (exitNarration && exitNarration.trim()) return exitNarration.trim();
  return `[${name || '道具'} 的效果消退了]`;
}

/**
 * 撤回当前激活的道具，返回撤回旁白文本（调用方负责发送）。
 * 无激活道具时返回 null。
 */
export function revokeActiveProp(contactId: string): string | null {
  const record = getActiveRecord(contactId);
  if (!record) return null;
  const name = record.itemSnapshot?.name || '道具';
  deactivateProp(contactId);
  return `[${name} 被收回了]`;
}

/**
 * 过期/退场当前激活的道具，返回退场旁白文本（调用方负责发送）。
 * 无激活道具时返回 null。
 */
export function expireActiveProp(contactId: string, exitNarration?: string): string | null {
  const record = getActiveRecord(contactId);
  if (!record) return null;
  const name = record.itemSnapshot?.name || '道具';
  deactivateProp(contactId);
  return buildExitNarration(name, exitNarration);
}

/** 读取当前激活的道具记录，无则返回 null */
export function getActiveRecord(contactId: string): WoKongActiveRecord | null {
  const raw = localStorage.getItem(storageKey(contactId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WoKongActiveRecord;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// 道具列表持久化（按 contactId）
// key: `woyuprop_list_${contactId}`
// ─────────────────────────────────────────────

export interface WoYuPropRecord {
  id: number;
  name: string;
  emoji: string;
  shape: string;
  usage: string;
  charKnowledge: string;
  triggerMode: 'immediate' | 'condition';
  triggerKeywords: string;
  triggerCount: number;
  triggerTimeout: string;
  entryNarration: string;
  buff: string;
  exitMode: 'messages' | 'time' | 'keyword';
  exitMessages: number;
  exitMinutes: number;
  exitKeywords: string;
  exitKeywordCount: number;
  exitNarration: string;
}

const propListKey = (contactId: string) => `woyuprop_list_${contactId}`;

/** 读取某个 contact 的所有道具 */
export function loadPropList(contactId: string): WoYuPropRecord[] {
  try {
    const raw = localStorage.getItem(propListKey(contactId));
    return raw ? (JSON.parse(raw) as WoYuPropRecord[]) : [];
  } catch {
    return [];
  }
}

/** 保存整个道具列表 */
export function savePropList(contactId: string, list: WoYuPropRecord[]): void {
  localStorage.setItem(propListKey(contactId), JSON.stringify(list));
}

// ─────────────────────────────────────────────
// 状态机推进
// ─────────────────────────────────────────────

/** 关键词在文本中的命中次数（不区分大小写） */
function countMatches(text: string, keyword: string): number {
  if (!keyword.trim()) return 0;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'gi');
  return (text.match(re) || []).length;
}

export type TickResult =
  | { action: 'none' }
  | { action: 'activated' }           // pending → active
  | { action: 'expired'; narration: string }   // 到期退场
  | { action: 'pendingTimeout'; narration: string }; // pending 超时退场

/**
 * 每条消息到达时调用，推进道具状态机。
 * @param contactId 联系人 ID
 * @param type      'ai' = char 回复；'user' = 用户发送
 * @param text      消息文本
 * @returns TickResult，调用方根据 action 决定是否发旁白
 */
export function tickProp(contactId: string, type: 'ai' | 'user', text: string): TickResult {
  const record = getActiveRecord(contactId);
  if (!record) return { action: 'none' };

  const item = record.itemSnapshot as WoKongItemSnapshot & {
    trigger?: { keywords?: string[]; hitCount?: number; timeoutMsgs?: number };
    end?: { mode?: string; msgCount?: number; hitCount?: number; keywords?: string[] };
    exitNarration?: string;
  };

  if (record.state === 'pending') {
    // ── pending：尝试触发 ──
    if (type === 'ai' && text) {
      const keywords: string[] = item.trigger?.keywords ?? [];
      const hits = keywords.reduce((n, kw) => n + countMatches(text, kw), 0);
      if (hits > 0) {
        record.triggerHitCounter = (record.triggerHitCounter || 0) + hits;
        if (record.triggerHitCounter >= (item.trigger?.hitCount ?? 1)) {
          record.state = 'active';
          record.activatedAt = Date.now();
          // 如果退场是消息数模式，初始化计数
          if (item.end?.mode === 'msgCount' && item.end.msgCount) {
            record.msgCounterRemaining = item.end.msgCount;
          }
          localStorage.setItem(storageKey(contactId), JSON.stringify(record));
          return { action: 'activated' };
        }
      }
    }

    // ── pending 超时 ──
    if (type === 'ai' && item.trigger?.timeoutMsgs) {
      record.pendingMsgCounter = (record.pendingMsgCounter || 0) + 1;
      if (record.pendingMsgCounter >= item.trigger.timeoutMsgs) {
        const narration = buildExitNarration(item.name, item.exitNarration);
        deactivateProp(contactId);
        return { action: 'pendingTimeout', narration };
      }
    }

    localStorage.setItem(storageKey(contactId), JSON.stringify(record));
    return { action: 'none' };
  }

  if (record.state === 'active') {
    // ── active：消息数退场 ──
    if (item.end?.mode === 'msgCount' && type === 'ai') {
      record.msgCounterRemaining = (record.msgCounterRemaining ?? 0) - 1;
      if (record.msgCounterRemaining <= 0) {
        const narration = buildExitNarration(item.name, item.exitNarration);
        deactivateProp(contactId);
        return { action: 'expired', narration };
      }
    }

    // ── active：关键词退场 ──
    if (item.end?.mode === 'keyword' && type === 'ai' && text) {
      const keywords: string[] = item.end.keywords ?? [];
      const hits = keywords.reduce((n, kw) => n + countMatches(text, kw), 0);
      if (hits > 0) {
        record.endHitCounter = (record.endHitCounter || 0) + hits;
        if (record.endHitCounter >= (item.end.hitCount ?? 1)) {
          const narration = buildExitNarration(item.name, item.exitNarration);
          deactivateProp(contactId);
          return { action: 'expired', narration };
        }
      }
    }

    // duration 模式不在这里检查，由外部（打开弹窗/进入页面时）调用 checkDurationExpired

    localStorage.setItem(storageKey(contactId), JSON.stringify(record));
    return { action: 'none' };
  }

  return { action: 'none' };
}

/**
 * 检查时间模式是否已到期（在进入聊天页面或打开弹窗时调用）。
 * 已到期则清除并返回退场旁白文本，否则返回 null。
 */
export function checkDurationExpired(contactId: string): string | null {
  const record = getActiveRecord(contactId);
  if (!record || record.state !== 'active') return null;

  const item = record.itemSnapshot as WoKongItemSnapshot & {
    end?: { mode?: string; durationMin?: number };
    exitNarration?: string;
  };
  if (item.end?.mode !== 'duration') return null;
  if (!record.activatedAt || !item.end.durationMin) return null;

  const elapsed = (Date.now() - record.activatedAt) / 60000;
  if (elapsed >= item.end.durationMin) {
    const narration = buildExitNarration(item.name, item.exitNarration);
    deactivateProp(contactId);
    return narration;
  }
  return null;
}

/**
 * 拼接当前 contactId 的道具系统提示词。
 * 无激活道具时返回空字符串。
 */
export function getWoKongSystemPrompt(contactId: string): string {
  const record = getActiveRecord(contactId);
  if (!record) return '';
  const item = record.itemSnapshot;
  if (!item) return '';

  const lines: string[] = [];
  lines.push('\n\n[我控道具 · 必须严格扮演]');
  lines.push('你受一件道具影响，必须真实演绎其设定，不可忽视、否认或淡化。');

  // 道具档案
  lines.push(`\n道具：${item.name}${item.emoji ? ' ' + item.emoji : ''}`);
  if (item.appearance) lines.push(`形态：${item.appearance}`);
  if (item.charCognition) lines.push(`你的认知：${item.charCognition}`);
  if (item.usage) lines.push(`作用：${item.usage}`);

  if (record.state === 'pending') {
    lines.push('\n当前：物品在场景中，效果未启动。按"你的认知"真实感知它。接触它后效果开始生效。');
  } else if (record.state === 'active') {
    lines.push('\n当前：效果生效中。');
    if (item.buffEffect) {
      lines.push(`你的表现：${item.buffEffect}`);
    } else {
      lines.push('表现基于"作用"自然演绎。');
    }
    lines.push('从这条起每一条回复都持续真实地体现这个状态——语气/反应/动作/思绪受影响，不中途遗忘，不"恢复正常"，不主动解释。');
  }

  return lines.join('\n');
}
