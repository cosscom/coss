import { type CalEvent, type EventColor, instantAt, resolveView } from "kloq";

interface Plan {
  title: string;
  /** days from today, minutes from midnight, length in minutes */
  day: number;
  at: number;
  minutes: number;
  color: EventColor;
}

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

const PLAN: Plan[] = [
  { title: "Board prep", day: -2, at: h(11), minutes: 120, color: "violet" },
  { title: "Standup", day: -1, at: h(9), minutes: 15, color: "blue" },
  { title: "Standup", day: 0, at: h(9), minutes: 15, color: "blue" },
  { title: "Sprint planning", day: 0, at: h(10), minutes: 60, color: "blue" },
  { title: "Lunch with Sam", day: 0, at: h(12, 30), minutes: 60, color: "emerald" },
  { title: "Design review", day: 0, at: h(15), minutes: 45, color: "violet" },
  { title: "Standup", day: 1, at: h(9), minutes: 15, color: "blue" },
  { title: "1:1 with Priya", day: 1, at: h(9, 30), minutes: 30, color: "blue" },
  { title: "Dentist", day: 2, at: h(8), minutes: 60, color: "rose" },
  { title: "Roadmap", day: 3, at: h(14), minutes: 90, color: "amber" },
  { title: "Offsite", day: 7, at: h(9), minutes: 480, color: "emerald" },
  { title: "Release", day: 9, at: h(16), minutes: 60, color: "amber" },
  { title: "Retro", day: 10, at: h(15), minutes: 45, color: "violet" },
];

/** A month of events around today, as plain timed `CalEvent`s. */
export function monthEvents(now: Date): CalEvent[] {
  const view = resolveView("month", 1, now);
  return PLAN.map((p, i) => ({
    id: `plan-${i}`,
    title: p.title,
    color: p.color,
    start: instantAt(view, view.todayIndex + p.day, p.at),
    end: instantAt(view, view.todayIndex + p.day, p.at + p.minutes),
  }));
}
