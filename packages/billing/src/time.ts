/**
 * Billing time. Periods are calendar months in UTC; contract boundaries are whole hours (usage is
 * counted per hour, so a boundary inside an hour couldn't split it); proration is by hours.
 */

export const HOUR_MS = 60 * 60 * 1000;

/** `[start, end)`. */
export type Interval = { start: Date; end: Date };

export function floorHour(at: Date): Date {
  return new Date(Math.floor(at.getTime() / HOUR_MS) * HOUR_MS);
}

export function ceilHour(at: Date): Date {
  return new Date(Math.ceil(at.getTime() / HOUR_MS) * HOUR_MS);
}

export function isHourAligned(at: Date): boolean {
  return at.getTime() % HOUR_MS === 0;
}

export function monthStart(at: Date): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1));
}

/** The first instant of the month `months` after the one containing `at`. */
export function addMonths(at: Date, months: number): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + months, 1));
}

export function isMonthStart(at: Date): boolean {
  return at.getTime() === monthStart(at).getTime();
}

/** The billing period (calendar month) containing `at`. */
export function periodOf(at: Date): Interval {
  const start = monthStart(at);
  return { start, end: addMonths(start, 1) };
}

export function nextPeriod(period: Interval): Interval {
  return { start: period.end, end: addMonths(period.end, 1) };
}

export function previousPeriod(period: Interval): Interval {
  return { start: addMonths(period.start, -1), end: period.start };
}

/** Whole calendar months from the month containing `from` to the one containing `to` (may be < 0). */
export function monthIndex(from: Date, to: Date): number {
  return (
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth())
  );
}

export function hoursIn(interval: Interval): bigint {
  return BigInt(Math.round((interval.end.getTime() - interval.start.getTime()) / HOUR_MS));
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function intersect(a: Interval, b: Interval): Interval | null {
  const start = a.start > b.start ? a.start : b.start;
  const end = a.end < b.end ? a.end : b.end;
  return start < end ? { start, end } : null;
}

export function contains(interval: Interval, at: Date): boolean {
  return interval.start <= at && at < interval.end;
}

/** "October 2026". */
export function formatPeriod(period: Interval): string {
  return period.start.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Oct 12 – Oct 31, 2026" (end shown inclusive). */
export function formatInterval(interval: Interval): string {
  const last = new Date(interval.end.getTime() - 1);
  const day = { month: "short", day: "numeric", timeZone: "UTC" } as const;
  const year = { ...day, year: "numeric" } as const;
  return `${interval.start.toLocaleDateString("en-US", day)} – ${last.toLocaleDateString("en-US", year)}`;
}
