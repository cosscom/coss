"use client";

import { CalendarList, isVisible, Kloq, useCalendarSources } from "kloq";
import { useEffect, useState } from "react";
import { Bar } from "../parts";
import { ME, registerTeam, teamEvents } from "./data";

export default function TeamScheduleExample() {
  useEffect(() => registerTeam(), []);
  const [events] = useState(() => teamEvents());
  const { sources } = useCalendarSources();
  const shown = sources.filter(isVisible).length;

  return (
    <div className="@container flex flex-col">
      <Bar>
        <span>
          <span className="text-foreground tabular-nums">
            {shown}/{sources.length}
          </span>{" "}
          calendars shown
        </span>
        <span className="ms-auto truncate">you · {ME}</span>
      </Bar>
      <div className="border-b px-4 py-3">
        <CalendarList
          heading={null}
          allowSetDefault={false}
          className="@2xl:flex-row @2xl:gap-10 @2xl:*:flex-1"
        />
      </div>

      <div className="h-136">
        <Kloq
          defaultEvents={events}
          currentUserEmail={ME}
          persistence={false}
          designMode={false}
          storage={false}
        >
          <Kloq.Toolbar />
        </Kloq>
      </div>
    </div>
  );
}
