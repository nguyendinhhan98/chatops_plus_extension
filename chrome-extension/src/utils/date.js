/**
 * Date Utilities — Chrome Extension
 * Port từ src/utils/date.ts — viết bằng native JS (không cần date-fns)
 */

/**
 * Get Monday–Sunday range for the current week (local time).
 */
export function getCurrentWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { from: monday, to: sunday };
}

/**
 * Get Monday–Sunday range for last week.
 */
export function getLastWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() + diffToMonday);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  lastMonday.setHours(0, 0, 0, 0);

  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  return { from: lastMonday, to: lastSunday };
}

/**
 * Parse a flexible date string (ISO format).
 * Returns null if invalid.
 */
export function parseFlexibleDate(input) {
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Convert a Date to Unix milliseconds.
 */
export function toUnixMs(date) {
  return date.getTime();
}

/**
 * Format a Unix ms timestamp to Vietnamese-style datetime.
 * e.g. "25/04/2025 14:30:05"
 */
export function formatUnixMsToVN(unixMs) {
  const d = new Date(unixMs);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Format Date to short Vietnamese-style date (no time).
 * e.g. "25/04/2025"
 */
export function formatDateToVN(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/**
 * Format relative time (e.g., "5 phút trước", "2 giờ trước").
 */
export function formatRelativeTime(unixMs) {
  const diffMs = Date.now() - unixMs;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return formatUnixMsToVN(unixMs);
}
