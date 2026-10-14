import { type CalEvent, formatInstant } from "kloq";
import { MOCK_CALENDARS } from "./mock-accounts";

const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const dateOnly = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** `count` events scattered over `spreadDays` around `anchor`, ~5% all-day. */
export function stressEvents(
  count: number,
  anchor: Date = new Date(),
  spreadDays = 365,
): CalEvent[] {
  const rand = rng(1);
  const out: CalEvent[] = [];
  const half = Math.floor(spreadDays / 2);
  for (let i = 0; i < count; i++) {
    const day = new Date(anchor);
    day.setDate(day.getDate() + Math.floor(rand() * spreadDays) - half);
    day.setHours(0, 0, 0, 0);
    const calendarId = MOCK_CALENDARS[Math.floor(rand() * MOCK_CALENDARS.length)].id;
    if (rand() < 0.05) {
      const end = new Date(day);
      end.setDate(end.getDate() + 1 + Math.floor(rand() * 3));
      out.push({
        id: `s${i}`,
        title: `Event ${i}`,
        allDay: true,
        start: dateOnly(day),
        end: dateOnly(end),
        calendarId,
      });
      continue;
    }
    const start = new Date(day);
    start.setMinutes(7 * 60 + Math.floor(rand() * 52) * 15);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 15 + Math.floor(rand() * 8) * 15);
    out.push({
      id: `s${i}`,
      title: `Event ${i}`,
      start: formatInstant(start),
      end: formatInstant(end),
      calendarId,
    });
  }
  return out;
}

export interface StressOptions {
  count: number;
  /** serve events per visible range through onRangeChange instead of all at once */
  paged: boolean;
  /** days of padding either side of the fetched range */
  padding: number;
}

export function parseStress(
  params: Record<string, string | string[] | undefined>,
): StressOptions | null {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const count = Number(first(params.events));
  if (!Number.isFinite(count) || count <= 0) return null;
  const pad = Number(first(params.pad));
  return {
    count: Math.min(Math.floor(count), 200_000),
    paged: first(params.paged) !== undefined && first(params.paged) !== "0",
    padding: Number.isFinite(pad) && pad >= 0 ? Math.floor(pad) : 7,
  };
}
