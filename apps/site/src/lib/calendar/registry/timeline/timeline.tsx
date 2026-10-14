"use client";

/**
 * coss calendar starter — a full-page resource timeline.
 *
 * Rooms as lanes, `byResourceId()` as the adapter: each booking names its
 * room through a plain `resourceId` field, and dragging one across rows
 * reassigns it (the adapter's `assign` is the inverse of `laneOf`).
 *
 * `timelineWindow` is left in derived mode — no `start`/`end` — so the
 * window tracks the toolbar's next/prev/today the same way every other
 * view's visible range does; only the working-hours offset and span are
 * overridden. Passing both `start` and `end` instead would pin the window
 * exactly but stop navigation from moving it, which is the wrong trade for
 * a starter meant to feel alive out of the box.
 *
 * Uncontrolled otherwise: coss calendar owns the anchor date and persists bookings to
 * localStorage, same as the calendar starter. Delete the wrapper div's
 * height at your peril — <Kloq> is h-full and renders into whatever box you
 * give it.
 */

import { byResourceId, type CalEvent, formatInstant, Kloq, type Lane } from "kloq";
import "kloq/styles.css";

type Booking = CalEvent & { resourceId: string };

const LANES: Lane[] = [
  { id: "sunroom", label: "Sunroom", sublabel: "2nd floor · 8 seats" },
  { id: "boardroom", label: "Boardroom", sublabel: "3rd floor · 14 seats" },
  { id: "studio", label: "Studio", sublabel: "Ground floor · 6 seats" },
  { id: "focus-pod", label: "Focus pod", sublabel: "3rd floor · 2 seats" },
];

const LANE_ADAPTER = byResourceId();

/** Today at the given local hour/minute, as an offset-qualified instant. */
function at(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return formatInstant(d);
}

const BOOKINGS: Booking[] = [
  {
    id: "tl-standup",
    title: "Standup",
    resourceId: "studio",
    start: at(9, 0),
    end: at(9, 15),
    color: "blue",
  },
  {
    id: "tl-budget",
    title: "Budget review",
    resourceId: "boardroom",
    start: at(9, 0),
    end: at(11, 0),
    color: "violet",
  },
  {
    id: "tl-interview",
    title: "Interview: Sam Okafor",
    resourceId: "boardroom",
    start: at(10, 0),
    end: at(10, 45),
    color: "amber",
  },
  {
    id: "tl-focus",
    title: "Focus block",
    resourceId: "focus-pod",
    start: at(8, 0),
    end: at(12, 0),
    color: "emerald",
  },
  {
    id: "tl-demo",
    title: "Product demo",
    resourceId: "studio",
    start: at(13, 0),
    end: at(14, 0),
    color: "rose",
  },
  {
    id: "tl-1on1",
    title: "1:1: Priya",
    resourceId: "sunroom",
    start: at(14, 0),
    end: at(14, 30),
    color: "blue",
  },
  {
    id: "tl-allhands-prep",
    title: "All-hands prep",
    resourceId: "boardroom",
    start: at(15, 0),
    end: at(16, 0),
    color: "violet",
  },
];

export function Timeline() {
  return (
    <div className="h-dvh">
      <Kloq
        view="timeline"
        lanes={LANES}
        laneAdapter={LANE_ADAPTER}
        defaultEvents={BOOKINGS}
        timelineWindow={{ startOffsetMinutes: 7 * 60, spanMinutes: 12 * 60 }}
      >
        <Kloq.Toolbar />
      </Kloq>
    </div>
  );
}
