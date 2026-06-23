/**
 * 聊天时间戳工具库
 * 仿微信风格：两条消息间隔超过 10 分钟才显示时间戳
 */

/** 10 分钟的毫秒数 */
const TEN_MINUTES_MS = 10 * 60 * 1000;

/**
 * 判断当前消息是否需要显示时间戳。
 * @param currentTimestamp  当前消息的时间戳（毫秒）
 * @param prevTimestamp     上一条消息的时间戳（毫秒），第一条消息传 null
 * @returns 是否展示时间戳
 */
export function shouldShowTimestamp(
  currentTimestamp: number,
  prevTimestamp: number | null
): boolean {
  if (prevTimestamp === null) return true;
  return currentTimestamp - prevTimestamp >= TEN_MINUTES_MS;
}

/**
 * 将时间戳格式化为仿微信的易读时间字符串。
 *
 * 规则：
 *  - 今天        → "上午 10:20" / "下午 1:20"
 *  - 昨天        → "昨天 上午 10:20"
 *  - 今年更早    → "5月2日 下午 1:20"
 *  - 跨年        → "2023年5月2日 下午 1:20"
 *
 * @param timestamp 毫秒时间戳
 * @returns 格式化后的字符串
 */
export function formatChatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  // 将日期归零到当天 00:00:00.000，便于天级别比较
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOfMsgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const timeStr = formatAmPmTime(date);

  if (startOfMsgDay.getTime() === startOfToday.getTime()) {
    // 今天
    return timeStr;
  }

  if (startOfMsgDay.getTime() === startOfYesterday.getTime()) {
    // 昨天
    return `昨天 ${timeStr}`;
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (date.getFullYear() === now.getFullYear()) {
    // 同年更早
    return `${month}月${day}日 ${timeStr}`;
  }

  // 跨年
  return `${date.getFullYear()}年${month}月${day}日 ${timeStr}`;
}

/**
 * 内部辅助：将 Date 对象格式化为"上午/下午 H:MM"形式。
 * 遵循中文习惯：不补零，如"上午 9:05"、"下午 1:20"。
 */
function formatAmPmTime(date: Date): string {
  const hours24 = date.getHours();
  const minutes = date.getMinutes();
  const minuteStr = String(minutes).padStart(2, '0');

  if (hours24 < 12) {
    return `上午 ${hours24 === 0 ? 12 : hours24}:${minuteStr}`;
  }
  const hour12 = hours24 === 12 ? 12 : hours24 - 12;
  return `下午 ${hour12}:${minuteStr}`;
}
