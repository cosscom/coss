import { byResourceId, type CalEvent, formatInstant, type Lane } from "kloq";

export type Booking = CalEvent & { resourceId: string };

/** Each room is a lane; a booking names its room through a plain `resourceId` field. */
export const ROOMS: Lane[] = [
  { id: "sunroom", label: "Sunroom", sublabel: "2nd floor · 8 seats" },
  { id: "boardroom", label: "Boardroom", sublabel: "3rd floor · 14 seats", height: 132 },
  { id: "studio", label: "Studio", sublabel: "Ground floor · 6 seats" },
  { id: "focus-pod", label: "Focus pod", sublabel: "3rd floor · 2 seats" },
];

/** `byResourceId()` reads `resourceId` — the default a host gets by omitting `laneAdapter` entirely. */
export const ROOM_ADAPTER = byResourceId();

/** 7 AM–7 PM. A module constant: a new object each render would re-project every booking. */
export const OPENING_HOURS = { startOffsetMinutes: 7 * 60, spanMinutes: 12 * 60 };

/** Today at the given local hour/minute, as an offset-qualified instant. */
function at(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return formatInstant(d);
}

export function roomBookings(): Booking[] {
  return [
    {
      id: "rb-standup",
      title: "Standup",
      resourceId: "studio",
      start: at(9, 0),
      end: at(9, 15),
      color: "blue",
    },
    {
      id: "rb-budget",
      title: "Budget review",
      resourceId: "boardroom",
      start: at(9, 0),
      end: at(11, 0),
      color: "violet",
    },
    {
      id: "rb-interview",
      title: "Interview: Sam Okafor",
      resourceId: "boardroom",
      start: at(10, 0),
      end: at(10, 45),
      color: "amber",
    },
    {
      id: "rb-focus",
      title: "Focus block",
      resourceId: "focus-pod",
      start: at(8, 0),
      end: at(12, 0),
      color: "emerald",
    },
    {
      id: "rb-demo",
      title: "Product demo",
      resourceId: "studio",
      start: at(13, 0),
      end: at(14, 0),
      color: "rose",
    },
    {
      id: "rb-1on1",
      title: "1:1: Priya",
      resourceId: "sunroom",
      start: at(14, 0),
      end: at(14, 30),
      color: "blue",
    },
    {
      id: "rb-allhands",
      title: "All-hands prep",
      resourceId: "boardroom",
      start: at(15, 0),
      end: at(16, 0),
      color: "violet",
    },
  ];
}
