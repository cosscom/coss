import { type CalEvent, instantAt, type Keymap, resolveView } from "kloq";

/** A light week: a standup series to jump between and a few meetings to book around. */
export function buildWeek(now: Date = new Date()): CalEvent[] {
  const week = resolveView("week", 1, now);
  const at = (day: number, hour: number, minute = 0) => instantAt(week, day, hour * 60 + minute);

  return [
    {
      id: "standup",
      title: "Standup",
      color: "blue",
      rrule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
      start: at(0, 9, 30),
      end: at(0, 9, 45),
    },
    { id: "design", title: "Design review", color: "violet", start: at(1, 13), end: at(1, 14) },
    { id: "interview", title: "Interview", color: "rose", start: at(2, 15), end: at(2, 15, 45) },
    {
      id: "lunch",
      title: "Lunch with Sam",
      color: "amber",
      busy: false,
      start: at(4, 12),
      end: at(4, 13),
    },
  ];
}

export const EVENTS = buildWeek();

/** Vim-style navigation: `t` becomes `g`, and the shipped-unbound range pair gets `h` / `l`. */
export const KEYMAP: Keymap = { today: "g", "prev-period": "h", "next-period": "l" };
