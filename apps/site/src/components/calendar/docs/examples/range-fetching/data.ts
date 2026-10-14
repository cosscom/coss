import {
  type CalEvent,
  type EventColor,
  formatInstant,
  instantPlus,
  parseInstant,
  toDateOnlyString,
} from "kloq";

const TITLES = [
  "Standup",
  "Design review",
  "1:1",
  "Deep work",
  "Customer call",
  "Planning",
  "Retro",
  "Interview",
  "Lunch",
  "Pairing",
  "Demo",
  "Roadmap",
];
const COLORS: EventColor[] = ["blue", "violet", "emerald", "amber", "rose"];

/** mulberry32 — a seeded generator, so every visitor gets the same 300 events. */
function prng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** ~300 events over the 16 weeks around `now`, weekends mostly empty. */
export function generateEvents(now: Date, count = 300): CalEvent[] {
  const rand = prng(20260830);
  const first = new Date(now);
  first.setHours(0, 0, 0, 0);
  first.setDate(first.getDate() - 8 * 7);

  const events: CalEvent[] = [];
  while (events.length < count) {
    const day = new Date(first);
    day.setDate(first.getDate() + Math.floor(rand() * 16 * 7));
    if (day.getDay() % 6 === 0 && rand() < 0.8) continue;

    const id = `ev-${events.length}`;
    const title = TITLES[Math.floor(rand() * TITLES.length)];
    const color = COLORS[events.length % COLORS.length];
    if (rand() < 0.06) {
      const next = new Date(day);
      next.setDate(day.getDate() + 1);
      events.push({
        id,
        title,
        color,
        allDay: true,
        start: toDateOnlyString(day),
        end: toDateOnlyString(next),
      });
      continue;
    }
    day.setHours(8 + Math.floor(rand() * 10), rand() < 0.5 ? 0 : 30);
    const start = formatInstant(day);
    events.push({
      id,
      title,
      color,
      start,
      end: instantPlus(start, 30 * (1 + Math.floor(rand() * 4))),
    });
  }
  return events;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Holds every event; the calendar only ever sees the pages it asked for. */
export class EventServer {
  private db: Map<string, CalEvent>;

  constructor(now: Date) {
    this.db = new Map(generateEvents(now).map((e) => [e.id, e]));
  }

  get size() {
    return this.db.size;
  }

  /** Events touching `[start, end)`, one simulated round-trip later. */
  async fetchRange(start: Date, end: Date): Promise<CalEvent[]> {
    await sleep(350);
    const lo = start.getTime();
    const hi = end.getTime();
    return [...this.db.values()].filter(
      (e) => parseInstant(e.start) < hi && parseInstant(e.end) > lo,
    );
  }

  /** Write-through from `onEventsChange`: `after` is only the loaded pages, so a deletion is an id that went missing. */
  sync(before: CalEvent[], after: CalEvent[]) {
    const kept = new Set(after.map((e) => e.id));
    for (const e of before) if (!kept.has(e.id)) this.db.delete(e.id);
    for (const e of after) this.db.set(e.id, e);
  }
}
