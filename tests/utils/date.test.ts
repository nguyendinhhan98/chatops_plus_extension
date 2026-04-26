import { describe, it, expect } from 'vitest';
import {
  parseFlexibleDate,
  toUnixMs,
  formatUnixMsToVN,
  getLastWeekRange,
  getCurrentWeekRange,
  getDayRange,
} from '../../src/utils/date.ts';

describe('parseFlexibleDate', () => {
  it('parses a valid ISO date string', () => {
    const result = parseFlexibleDate('2026-04-14');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2026);
    expect(result?.getMonth()).toBe(3); // 0-indexed
    expect(result?.getDate()).toBe(14);
  });

  it('parses a full ISO datetime string', () => {
    const result = parseFlexibleDate('2026-04-14T08:00:00Z');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2026);
  });

  it('returns null for an invalid string', () => {
    expect(parseFlexibleDate('not-a-date')).toBeNull();
    expect(parseFlexibleDate('')).toBeNull();
    expect(parseFlexibleDate('2026-99-99')).toBeNull();
  });
});

describe('toUnixMs', () => {
  it('converts a Date to Unix milliseconds', () => {
    const date = new Date('2026-04-14T00:00:00.000Z');
    expect(toUnixMs(date)).toBe(date.getTime());
    expect(typeof toUnixMs(date)).toBe('number');
  });

  it('returns a positive number', () => {
    expect(toUnixMs(new Date())).toBeGreaterThan(0);
  });
});

describe('formatUnixMsToVN', () => {
  it('formats a timestamp to Vietnamese date format', () => {
    // 2026-04-14 08:30:05 UTC
    const ms = new Date('2026-04-14T08:30:05').getTime();
    const result = formatUnixMsToVN(ms);
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
    expect(result).toContain('2026');
  });
});

describe('getLastWeekRange', () => {
  it('returns a range where from is before to', () => {
    const { from, to } = getLastWeekRange();
    expect(from).toBeInstanceOf(Date);
    expect(to).toBeInstanceOf(Date);
    expect(from.getTime()).toBeLessThan(to.getTime());
  });

  it('from is a Monday (weekStartsOn: 1)', () => {
    const { from } = getLastWeekRange();
    expect(from.getDay()).toBe(1); // 1 = Monday
  });

  it('to is a Sunday', () => {
    const { to } = getLastWeekRange();
    expect(to.getDay()).toBe(0); // 0 = Sunday
  });

  it('span is approximately 7 days', () => {
    const { from, to } = getLastWeekRange();
    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(6.99, 0);
  });
});

describe('getCurrentWeekRange', () => {
  it('returns a valid range', () => {
    const { from, to } = getCurrentWeekRange();
    expect(from.getTime()).toBeLessThan(to.getTime());
  });
});

describe('getDayRange', () => {
  it('from is start of day (00:00:00)', () => {
    const date = new Date('2026-04-14T12:30:00');
    const { from } = getDayRange(date);
    expect(from.getHours()).toBe(0);
    expect(from.getMinutes()).toBe(0);
    expect(from.getSeconds()).toBe(0);
  });

  it('to is end of day (23:59:59)', () => {
    const date = new Date('2026-04-14T12:30:00');
    const { to } = getDayRange(date);
    expect(to.getHours()).toBe(23);
    expect(to.getMinutes()).toBe(59);
    expect(to.getSeconds()).toBe(59);
  });
});
