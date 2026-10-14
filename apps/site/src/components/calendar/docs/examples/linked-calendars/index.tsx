"use client";

import { type CalEvent, Kloq, useIsClient } from "kloq";
import { useState } from "react";
import { Bar, Nav } from "../parts";
import { monthEvents } from "./data";

export default function LinkedCalendarsExample() {
  const [date, setDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalEvent[]>(() => monthEvents(new Date()));
  const isClient = useIsClient();

  const shared = {
    date,
    onDateChange: setDate,
    events,
    onEventsChange: setEvents,
    responsive: false,
    persistence: false,
    designMode: false,
    storage: false,
  } as const;

  return (
    <div className="@container flex flex-col">
      <Bar className="justify-between">
        <span>shared date</span>
        <span className="text-foreground tabular-nums">
          {isClient
            ? date.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : ""}
        </span>
        <span className="tabular-nums">{events.length} events</span>
      </Bar>
      {/* `useKloq()` inside `Nav` reads whichever `<Kloq>` it is rendered in */}
      <div className="grid @3xl:grid-cols-2">
        <div className="h-104 min-w-0 border-b @3xl:border-r @3xl:border-b-0">
          <Kloq view="month" {...shared}>
            <Kloq.Toolbar>
              <Nav />
            </Kloq.Toolbar>
          </Kloq>
        </div>
        <div className="h-104 min-w-0">
          <Kloq view="day" {...shared}>
            <Kloq.Toolbar>
              <Nav />
            </Kloq.Toolbar>
          </Kloq>
        </div>
      </div>
    </div>
  );
}
