import { type CalEvent, instantAt, resolveView } from "kloq";

/** Each phrase exercises a different part of the grammar; the last one has a length the range overrules. */
export const PHRASES = [
  "Deep work tomorrow from 9 to 11",
  "Lunch with Sam friday 1pm at Dishoom",
  "Sync tuesday 2-3pm with jo@acme.com",
  "Retro thursday 2-3pm for 45 mins",
];

/** A light week so the planner has something to slot around. */
export function buildWeek(now: Date = new Date()): CalEvent[] {
  const week = resolveView("week", 1, now);
  const at = (day: number, hour: number, minute = 0) => instantAt(week, day, hour * 60 + minute);

  return [
    {
      id: "standup",
      title: "Standup",
      color: "blue",
      start: at(0, 9, 30),
      end: at(0, 9, 45),
      rrule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
    },
    { id: "design", title: "Design review", color: "violet", start: at(1, 14), end: at(1, 15) },
    { id: "interview", title: "Interview", color: "rose", start: at(3, 11), end: at(3, 11, 45) },
  ];
}

export const EVENTS = buildWeek();
