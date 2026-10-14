"use client";

import {
  type CalEvent,
  type ConstraintSlot,
  instantAt,
  type KloqConstraints,
  resolveView,
  toDateOnlyString,
} from "kloq";
import { useMemo, useState } from "react";
import { DocDemo } from "./doc-demo";

/** Wednesday of the current week, so the per-date windows land on a visible column. */
function wednesday(): Date {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 2);
  d.setHours(0, 0, 0, 0);
  return d;
}

function seedEvents(): CalEvent[] {
  const w = resolveView("week", 1, new Date());
  const at = (day: number, min: number) => instantAt(w, day, min);
  return [
    {
      id: "c-standup",
      title: "Standup",
      start: at(1, 9 * 60 + 30),
      end: at(1, 10 * 60),
      color: "blue",
    },
    {
      id: "c-pairing",
      title: "Pairing",
      start: at(2, 10 * 60),
      end: at(2, 11 * 60 + 30),
      color: "violet",
    },
    {
      id: "c-review",
      title: "Portfolio review",
      start: at(2, 14 * 60),
      end: at(2, 15 * 60),
      color: "emerald",
    },
    { id: "c-retro", title: "Retro", start: at(4, 11 * 60), end: at(4, 12 * 60), color: "amber" },
  ];
}

const overlaps = (slot: ConstraintSlot, from: Date, to: Date) => slot.start < to && slot.end > from;

export function ConstraintsDemo() {
  const events = useMemo(() => seedEvents(), []);
  const [wed] = useState(wednesday);

  const constraints = useMemo<KloqConstraints>(() => {
    const minDate = new Date();
    minDate.setHours(0, 0, 0, 0);
    const wedKey = toDateOnlyString(wed);
    return {
      minDate,
      isSlotDisabled(slot) {
        if (slot.allDay) return false;
        const dayKey = toDateOnlyString(slot.start);
        const day = new Date(slot.start);
        day.setHours(0, 0, 0, 0);
        const win = (h1: number, m1: number, h2: number, m2: number) => {
          const from = new Date(day);
          from.setHours(h1, m1, 0, 0);
          const to = new Date(day);
          to.setHours(h2, m2, 0, 0);
          return overlaps(slot, from, to);
        };
        if (win(12, 30, 13, 30)) return true; // lunch, every day
        if (dayKey === wedKey && (win(16, 0, 20, 0) || win(21, 0, 22, 0))) return true;
        return false;
      },
    };
  }, [wed]);

  return (
    <DocDemo
      toolbar
      height="30rem"
      defaultView="week"
      defaultEvents={events}
      responsive={{ mediumBreakpoint: 0 }}
      workingHours={{ start: 9, end: 17 }}
      constraints={constraints}
    />
  );
}
