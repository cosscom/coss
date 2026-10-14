import { type CalEvent, instantAt, resolveView, toDateOnlyString } from "kloq";

/** Three series anchored on the Monday-start week containing `now`, plus one detached occurrence. */
export function buildSeries(now: Date = new Date()): CalEvent[] {
  const week = resolveView("week", 1, now);
  const at = (day: number, hour: number, minute = 0) => instantAt(week, day, hour * 60 + minute);
  const payday = new Date(now.getFullYear(), now.getMonth(), 25);
  const wednesdayStandup = at(2, 9);

  return [
    {
      id: "standup",
      title: "Standup",
      color: "blue",
      rrule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
      start: at(0, 9),
      end: at(0, 9, 15),
      // Wednesday's instance was moved — it lives below as its own event
      exdates: [wednesdayStandup],
    },
    {
      id: "standup-wed",
      title: "Standup · moved",
      color: "blue",
      start: at(2, 11),
      end: at(2, 11, 15),
      recurrenceId: wednesdayStandup,
    },
    {
      id: "review",
      title: "Sprint review",
      color: "violet",
      rrule: "FREQ=WEEKLY;INTERVAL=2;BYDAY=TH",
      start: at(3, 14),
      end: at(3, 15),
    },
    {
      id: "payday",
      title: "Payday",
      color: "emerald",
      allDay: true,
      busy: false,
      rrule: "FREQ=MONTHLY;BYMONTHDAY=25",
      start: toDateOnlyString(payday),
      end: toDateOnlyString(new Date(payday.getFullYear(), payday.getMonth(), 26)),
    },
  ];
}

export const SERIES = buildSeries();
