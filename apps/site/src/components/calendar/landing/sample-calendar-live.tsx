"use client";

import { Kloq } from "kloq";
import { useEffect, useMemo } from "react";
import { mockSeedEvents, registerMockAccounts } from "@/components/calendar/demo/mock-accounts";
import { busyWeekday } from "./busy-weekday";

export function SampleCalendarLive() {
  useEffect(() => registerMockAccounts(), []);
  const events = useMemo(() => mockSeedEvents(), []);
  return (
    <Kloq
      defaultEvents={events}
      persistence={false}
      defaultView={3}
      defaultDate={busyWeekday()}
      responsive={false}
      designMode={false}
    >
      <Kloq.Toolbar />
    </Kloq>
  );
}
