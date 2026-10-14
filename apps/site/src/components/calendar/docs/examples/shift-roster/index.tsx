"use client";

import { type CalEvent, EVENT_COLORS, Kloq } from "kloq";
import { useState } from "react";
import { Bar, Dot } from "../parts";
import { hoursByPerson, LANES, PEOPLE, rosterEvents, rosterWindow, STAFF_ADAPTER } from "./data";

const WORKING_HOURS = { start: 6, end: 22 };

export default function ShiftRosterExample() {
  const [events, setEvents] = useState<CalEvent[]>(() => rosterEvents());
  const [tlWindow] = useState(() => rosterWindow());
  const hours = hoursByPerson(events);

  return (
    <div className="@container flex flex-col">
      <Bar>
        <span>Fernhill Café · this week</span>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {PEOPLE.map((p) => (
            <li key={p.id} className="flex items-center gap-1.5">
              <Dot className={EVENT_COLORS[p.color].bar} />
              <span className="text-foreground">{p.name}</span>
              <span className="tabular-nums">{hours[p.id]}h</span>
            </li>
          ))}
        </ul>
      </Bar>

      <div className="h-136">
        <Kloq
          view="timeline"
          lanes={LANES}
          laneAdapter={STAFF_ADAPTER}
          timelineWindow={tlWindow}
          density="compact"
          workingHours={WORKING_HOURS}
          events={events}
          onEventsChange={setEvents}
          persistence={false}
          storage={false}
        />
      </div>
    </div>
  );
}
