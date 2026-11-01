import {
  hourLabel,
  type TimeZoneColumn,
  wallClockIn,
  zoneOffsetMinutes,
} from "../../kloq/src/lib/timezone.ts";

export type { TimeZoneColumn };

/** Wall-clock time of an instant in a given IANA zone. Same contract as kloq. */
export function zoneTimeAt(
  instant: Date | number,
  timeZone: string,
): { hour: number; minute: number } {
  const w = wallClockIn(instant, timeZone);
  return { hour: w.hour, minute: w.minute };
}

/** True when `timeZone` is offset from `relativeTo` by a non-whole hour. */
export function hasFractionalOffset(
  instant: Date | number,
  timeZone: string,
  relativeTo?: string,
): boolean {
  const base = relativeTo
    ? zoneOffsetMinutes(instant, relativeTo)
    : -new Date(instant).getTimezoneOffset();
  return (zoneOffsetMinutes(instant, timeZone) - base) % 60 !== 0;
}

export const formatZoneTime = hourLabel;

/** Whether `locale` prints a day period (`AM`/`PM`). Used when the host doesn't force `hour12`. */
export function localeUsesHour12(locale?: string): boolean {
  const parts = new Intl.DateTimeFormat(locale, { hour: "numeric" }).formatToParts(new Date());
  return parts.some((part) => part.type === "dayPeriod");
}

/**
 * Kept so `import { ZONE_CAPTION } from "expo-kloq"` matches kloq. It is a CSS
 * class string and is not applied on native.
 */
export const ZONE_CAPTION = "text-3xs font-medium uppercase tracking-wide text-muted-foreground";

/** Width of the single-zone gutter, in px — Tailwind's `w-16`. */
export const GUTTER_WIDTH = 64;

/** Gutter width with these extra columns. Same arithmetic as kloq. */
export function multiZoneGutterWidth(
  columns: readonly TimeZoneColumn[],
  instant: Date | number,
  relativeTo?: string,
): number {
  let w = GUTTER_WIDTH;
  for (const c of columns) {
    w += hasFractionalOffset(instant, c.timeZone, relativeTo) ? 62 : 46;
  }
  return w;
}
