/**
 * Date and Time Utilities
 */

/**
 * Formats a Unix timestamp (ms) to Vietnam localized string
 */
export function formatUnixMsToVN(ms) {
  if (!ms) return '';
  return new Date(ms).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Formats a Unix timestamp relative to now (e.g. "2 hours ago")
 */
export function formatRelativeTime(ms) {
  if (!ms) return '';
  const now = Date.now();
  const diff = now - ms;
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);

  if (sec < 60) return 'just now';
  if (min < 60) return `${min}m ago`;
  if (hour < 24) return `${hour}h ago`;
  if (day < 7) return `${day}d ago`;
  
  return new Date(ms).toLocaleDateString('vi-VN');
}

/**
 * Parses various date formats into a Date object
 */
export function parseFlexibleDate(str) {
  if (!str) return null;
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  // Handle DD/MM/YYYY
  const parts = str.split('/');
  if (parts.length === 3) {
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }
  return null;
}

/**
 * Converts Date object to Unix ms
 */
export function toUnixMs(date) {
  return date instanceof Date ? date.getTime() : 0;
}

/**
 * Gets the date range for the previous week
 */
export function getLastWeekRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 7);
  return { from, to };
}
