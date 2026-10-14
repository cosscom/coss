import { type CalEvent, type EventColor, instantAt, resolveView, zoneCityLabel } from "kloq";

/** What the display-zone picker offers. `"local"` means "no `displayTimeZone`" — the browser's own zone. */
export const DISPLAY_ZONES = [
  { value: "local", label: "Local" },
  ...["Europe/London", "America/New_York", "Asia/Tokyo", "Australia/Sydney"].map((id) => ({
    value: id,
    label: zoneCityLabel(id),
  })),
];

/** The extra gutter columns, in the order they are drawn. */
export const GUTTER_ZONES = ["Europe/London", "America/New_York", "Asia/Tokyo"];

interface Meeting {
  title: string;
  /** the zone the time was agreed in; omit for the browser's own */
  timeZone?: string;
  /** days from today, minutes from that zone's midnight, length in minutes */
  day: number;
  at: number;
  minutes: number;
  color: EventColor;
}

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

const MEETINGS: Meeting[] = [
  { title: "Tokyo standup", timeZone: "Asia/Tokyo", day: 0, at: h(9), minutes: 30, color: "rose" },
  { title: "Tokyo standup", timeZone: "Asia/Tokyo", day: 1, at: h(9), minutes: 30, color: "rose" },
  { title: "Tokyo standup", timeZone: "Asia/Tokyo", day: 2, at: h(9), minutes: 30, color: "rose" },
  {
    title: "Sydney retro",
    timeZone: "Australia/Sydney",
    day: 0,
    at: h(16),
    minutes: 45,
    color: "amber",
  },
  {
    title: "London design review",
    timeZone: "Europe/London",
    day: 0,
    at: h(10),
    minutes: 60,
    color: "violet",
  },
  {
    title: "NY release sync",
    timeZone: "America/New_York",
    day: 0,
    at: h(7, 30),
    minutes: 45,
    color: "blue",
  },
  {
    title: "London 1:1s",
    timeZone: "Europe/London",
    day: 1,
    at: h(9, 30),
    minutes: 90,
    color: "violet",
  },
  {
    title: "NY handoff",
    timeZone: "America/New_York",
    day: 1,
    at: h(8),
    minutes: 30,
    color: "blue",
  },
  {
    title: "Sydney planning",
    timeZone: "Australia/Sydney",
    day: 2,
    at: h(15),
    minutes: 60,
    color: "amber",
  },
  {
    title: "London design review",
    timeZone: "Europe/London",
    day: 2,
    at: h(11),
    minutes: 60,
    color: "violet",
  },
  { title: "Focus block", day: 2, at: h(14), minutes: 120, color: "emerald" },
];

/** Each meeting at its own wall-clock time, stored as an absolute instant. */
export function teamEvents(now: Date): CalEvent[] {
  const view = resolveView(3, 1, now);
  return MEETINGS.map((m, i) => ({
    id: `team-${i}`,
    title: m.title,
    color: m.color,
    timeZone: m.timeZone,
    start: instantAt(view, m.day, m.at, m.timeZone),
    end: instantAt(view, m.day, m.at + m.minutes, m.timeZone),
  }));
}
