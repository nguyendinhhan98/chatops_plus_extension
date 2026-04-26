import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  parseISO,
  isValid,
  format,
  startOfDay,
  endOfDay,
} from 'date-fns';

/**
 * Get Monday–Sunday range for the current week (local time).
 */
export function getCurrentWeekRange(): { from: Date; to: Date } {
  const now = new Date();
  return {
    from: startOfWeek(now, { weekStartsOn: 1 }), // Monday
    to: endOfWeek(now, { weekStartsOn: 1 }), // Sunday
  };
}

/**
 * Get Monday–Sunday range for last week (T2 → CN tuần trước).
 */
export function getLastWeekRange(): { from: Date; to: Date } {
  const lastWeek = subWeeks(new Date(), 1);
  return {
    from: startOfWeek(lastWeek, { weekStartsOn: 1 }),
    to: endOfWeek(lastWeek, { weekStartsOn: 1 }),
  };
}

/**
 * Parse a flexible date string.
 * Accepts ISO strings like "2025-01-01" or "2025-01-01T00:00:00Z".
 * Returns null if invalid.
 */
export function parseFlexibleDate(input: string): Date | null {
  const d = parseISO(input);
  return isValid(d) ? d : null;
}

/**
 * Convert a Date to Unix milliseconds (for ChatOps `since` param).
 */
export function toUnixMs(date: Date): number {
  return date.getTime();
}

/**
 * Format a Unix ms timestamp to a readable Vietnamese-style datetime.
 * e.g. "25/04/2025 14:30:05"
 */
export function formatUnixMsToVN(unixMs: number): string {
  return format(new Date(unixMs), 'dd/MM/yyyy HH:mm:ss');
}

/**
 * Get start-of-day and end-of-day timestamps for a date.
 */
export function getDayRange(date: Date): { from: Date; to: Date } {
  return {
    from: startOfDay(date),
    to: endOfDay(date),
  };
}

/**
 * Determine the default date range:
 * - T2 tuần trước → CN tuần trước (so sánh với ngày hiện tại)
 */
export function getDefaultSearchRange(): { from: Date; to: Date } {
  return getLastWeekRange();
}
