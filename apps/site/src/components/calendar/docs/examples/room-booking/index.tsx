"use client";

import { type CalEvent, Kloq } from "kloq";
import { useState } from "react";
import { OPENING_HOURS, ROOM_ADAPTER, ROOMS, roomBookings } from "./data";

export default function RoomBookingExample() {
  const [events, setEvents] = useState<CalEvent[]>(() => roomBookings());

  return (
    <div className="@container flex flex-col">
      <div className="h-136">
        <Kloq
          view="timeline"
          lanes={ROOMS}
          laneAdapter={ROOM_ADAPTER}
          timelineWindow={OPENING_HOURS}
          events={events}
          onEventsChange={setEvents}
          persistence={false}
          storage={false}
        >
          <Kloq.Toolbar>
            <Kloq.Nav />
            <span className="font-mono text-xs text-muted-foreground">4 rooms · 7 AM–7 PM</span>
          </Kloq.Toolbar>
        </Kloq>
      </div>
    </div>
  );
}
