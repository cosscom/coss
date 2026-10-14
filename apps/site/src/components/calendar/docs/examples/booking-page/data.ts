import {
  type Attendee,
  type CalEvent,
  dateOnlyAt,
  formatInstant,
  formatRange,
  type KloqConstraints,
  minutesOfDate,
  newEventId,
  parseInstant,
  resolveView,
  toDateOnlyString,
} from "kloq";

export const HOST = {
  name: "Priya Raman",
  email: "priya@lumen.dev",
  title: "Intro call",
  minutes: 30,
  hours: { start: 9, end: 17 },
};

export const DRAFT_ID = "draft";

type Hhmm = `${number}:${number}`;

/** Busy windows keyed by ISO date, each `["HH:mm", "HH:mm")` — the shape an availability endpoint returns. */
export type BusyCalendar = Record<string, [Hhmm, Hhmm][]>;

/** Demo stand-in for that endpoint: three days of busy time, keyed to the visible dates. */
export function busyCalendar(now = new Date()): BusyCalendar {
  const days = resolveView(3, 1, now);
  return {
    [dateOnlyAt(days, 0)]: [
      ["09:00", "10:00"],
      ["12:00", "13:00"],
      ["14:30", "15:30"],
    ],
    [dateOnlyAt(days, 1)]: [
      ["10:00", "11:30"],
      ["12:00", "13:00"],
      ["16:00", "17:00"],
    ],
    [dateOnlyAt(days, 2)]: [
      ["09:00", "09:30"],
      ["12:00", "13:00"],
      ["13:30", "15:00"],
    ],
  };
}

const minuteOf = (t: Hhmm) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Everything the grid must refuse: the past, time outside the host's hours,
 * her busy windows, and any booking already confirmed.
 */
export function hostConstraints(
  busy: BusyCalendar,
  bookings: CalEvent[],
  now = new Date(),
): KloqConstraints {
  const confirmed = bookings
    .filter((b) => b.readOnly)
    .map((b) => ({ start: parseInstant(b.start), end: parseInstant(b.end) }));

  return {
    minDate: now,
    isSlotDisabled(slot) {
      if (slot.allDay) return true; // a call is never all-day
      const startMin = minutesOfDate(slot.start);
      const endMin = startMin + (slot.end.getTime() - slot.start.getTime()) / 60_000;
      if (startMin < HOST.hours.start * 60 || endMin > HOST.hours.end * 60) return true;
      const windows = busy[toDateOnlyString(slot.start)] ?? [];
      if (windows.some(([from, to]) => startMin < minuteOf(to) && endMin > minuteOf(from)))
        return true;
      return confirmed.some((w) => slot.start.getTime() < w.end && slot.end.getTime() > w.start);
    },
  };
}

export function draftBooking(start: Date, end: Date): CalEvent {
  return {
    id: DRAFT_ID,
    title: "Your booking",
    start: formatInstant(start),
    end: formatInstant(end),
    color: "emerald",
  };
}

/** Anything the grid created or moved becomes the one draft — a visitor books one slot at a time. */
export function asDraft(event: CalEvent): CalEvent {
  return { ...event, id: DRAFT_ID, title: "Your booking", color: "emerald" };
}

export function confirmBooking(draft: CalEvent, guest: Attendee): CalEvent {
  return {
    ...draft,
    id: newEventId(),
    title: `${HOST.title} — ${guest.name}`,
    readOnly: true,
    attendees: [
      { email: HOST.email, name: HOST.name, status: "accepted" },
      { ...guest, status: "accepted" },
    ],
  };
}

export function whenLabel(event: CalEvent): string {
  const start = new Date(parseInstant(event.start));
  const end = new Date(parseInstant(event.end));
  const day = start.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `${day} · ${formatRange(minutesOfDate(start), minutesOfDate(end))}`;
}
