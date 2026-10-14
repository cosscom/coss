import {
  type CalEvent,
  type CalEventPatch,
  dateOnlyAfter,
  dateOnlyAt,
  type EventColor,
  instantAt,
  type Lane,
  type LaneAdapter,
  resolveView,
  wallMinutesBetween,
} from "kloq";

export interface Person {
  id: string;
  name: string;
  role: string;
  color: EventColor;
}

export const PEOPLE: Person[] = [
  { id: "ada", name: "Ada Okoye", role: "Front of house", color: "blue" },
  { id: "ben", name: "Ben Halvorsen", role: "Front of house", color: "violet" },
  { id: "chloe", name: "Chloé Martin", role: "Barista", color: "emerald" },
  { id: "dev", name: "Dev Patel", role: "Barista", color: "amber" },
  { id: "eli", name: "Eli Sandoval", role: "Kitchen", color: "rose" },
];

/** One row per person — the timeline's `lanes`. */
export const LANES: Lane[] = PEOPLE.map(
  (p): Lane => ({ id: p.id, label: p.name, sublabel: p.role }),
);

type Shift = CalEvent & { personId: string; kind: "shift" | "off" };

// person, day (0 = Monday), from hour, to hour
const SHIFTS: [string, number, number, number][] = [
  ["ada", 0, 6, 14],
  ["ada", 1, 6, 14],
  ["ada", 2, 6, 14],
  ["ada", 3, 6, 14],
  ["ada", 4, 6, 14],
  ["ben", 0, 14, 22],
  ["ben", 1, 14, 22],
  ["ben", 2, 14, 22],
  ["ben", 5, 8, 16],
  ["ben", 6, 8, 16],
  ["chloe", 1, 7, 15],
  ["chloe", 2, 7, 15],
  ["chloe", 3, 7, 15],
  ["chloe", 4, 7, 15],
  ["chloe", 5, 7, 15],
  ["dev", 0, 12, 20],
  ["dev", 3, 14, 22],
  ["dev", 4, 14, 22],
  ["dev", 5, 14, 22],
  ["dev", 6, 14, 22],
  ["eli", 0, 10, 18],
  ["eli", 1, 10, 18],
  ["eli", 2, 10, 18],
  ["eli", 5, 10, 18],
  ["eli", 6, 10, 18],
];

const DAYS_OFF: [string, number][] = [
  ["ada", 5],
  ["ada", 6],
  ["ben", 3],
  ["ben", 4],
  ["chloe", 0],
  ["chloe", 6],
  ["dev", 1],
  ["dev", 2],
  ["eli", 3],
  ["eli", 4],
];

const shiftName = (from: number) => (from < 9 ? "Open" : from >= 14 ? "Close" : "Mid");
const first = (p: Person) => p.name.split(" ")[0];
const personOf = (id: string) => PEOPLE.find((p) => p.id === id)!;

/**
 * The lane id lives in `personId`, same shape `byResourceId` reads — but
 * `assign` here does more than the default: reassigning a shift to someone
 * else's row also repaints its colour and retitles it to the new person, so
 * a dragged shift reads correctly on its new row instead of carrying its old
 * owner's name and colour along for the ride. `assign`'s only contract is
 * "the patch that puts this event on `laneId`" — nothing says that patch is
 * limited to the field `laneOf` reads.
 */
export const STAFF_ADAPTER: LaneAdapter = {
  laneOf: (event) => (event as Shift).personId ?? [],
  assign: (event, laneId): CalEventPatch => {
    const p = personOf(laneId);
    const shift = event as Shift;
    const title =
      shift.kind === "off" ? `${first(p)} off` : `${first(p)} · ${shift.title.split(" · ").at(-1)}`;
    return { personId: laneId, color: p.color, title } as CalEventPatch;
  },
};

/** A week of shifts and days off, one lane per person — see `LANES` / `STAFF_ADAPTER`. */
export function rosterEvents(now = new Date()): Shift[] {
  const w = resolveView("week", 1, now);

  const shifts = SHIFTS.map(([id, day, from, to]): Shift => {
    const p = personOf(id);
    return {
      id: `${id}-${day}`,
      title: `${first(p)} · ${shiftName(from)}`,
      personId: id,
      kind: "shift",
      start: instantAt(w, day, from * 60),
      end: instantAt(w, day, to * 60),
      color: p.color,
    };
  });

  const off = DAYS_OFF.map(([id, day]): Shift => {
    const p = personOf(id);
    return {
      id: `${id}-off-${day}`,
      title: `${first(p)} off`,
      personId: id,
      kind: "off",
      allDay: true,
      start: dateOnlyAt(w, day),
      end: dateOnlyAfter(w, day),
      color: p.color,
      busy: false,
    };
  });

  return [...shifts, ...off];
}

/** The timeline's window: the whole week, hour slots — a controlled span, so it stays this week regardless of ‹ ›. */
export function rosterWindow(now = new Date()) {
  const w = resolveView("week", 1, now);
  const start = w.days[0];
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60_000);
  return { start, end, slotMinutes: 60, pxPerSlot: 32 };
}

/** Rostered hours per person, from the live events — resizing a shift moves the number. */
export function hoursByPerson(events: CalEvent[]): Record<string, number> {
  const hours = Object.fromEntries(PEOPLE.map((p) => [p.id, 0]));
  for (const e of events) {
    const id = (e as Shift).personId;
    if (id && !e.allDay) hours[id] += wallMinutesBetween(e.start, e.end) / 60;
  }
  return hours;
}
