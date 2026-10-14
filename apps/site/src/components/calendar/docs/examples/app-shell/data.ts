import { type CalEvent, type EventColor, instantAt, resolveView } from "kloq";

interface Slot {
  title: string;
  /** days from today, minutes from midnight, length in minutes */
  day: number;
  at: number;
  minutes: number;
  color: EventColor;
  location?: string;
}

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

const WEEK: Slot[] = [
  { title: "Standup", day: 0, at: h(9), minutes: 15, color: "blue" },
  { title: "Design crit", day: 0, at: h(11), minutes: 60, color: "violet", location: "Room 4" },
  { title: "Lunch", day: 0, at: h(12, 30), minutes: 45, color: "emerald" },
  { title: "Ship v2.3", day: 0, at: h(15), minutes: 90, color: "amber" },
  { title: "Standup", day: 1, at: h(9), minutes: 15, color: "blue" },
  { title: "1:1 with Priya", day: 1, at: h(10), minutes: 30, color: "blue" },
  { title: "Customer call", day: 1, at: h(14), minutes: 45, color: "rose" },
  { title: "Standup", day: 2, at: h(9), minutes: 15, color: "blue" },
  { title: "Roadmap review", day: 2, at: h(13), minutes: 90, color: "violet" },
  { title: "Retro", day: 2, at: h(16), minutes: 45, color: "emerald" },
];

/** Three days of a product team's week, from today. */
export function shellEvents(now: Date): CalEvent[] {
  const view = resolveView(3, 1, now);
  return WEEK.map((s, i) => ({
    id: `shell-${i}`,
    title: s.title,
    color: s.color,
    location: s.location,
    start: instantAt(view, s.day, s.at),
    end: instantAt(view, s.day, s.at + s.minutes),
  }));
}
