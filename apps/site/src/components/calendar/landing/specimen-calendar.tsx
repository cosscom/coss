"use client";

import { Kloq, type KloqView } from "kloq";
import { useEffect, useMemo } from "react";
import { mockSeedEvents, registerMockAccounts } from "@/components/calendar/demo/mock-accounts";
import { busyWeekday } from "./busy-weekday";

export function SpecimenCalendar({
  view,
  onViewChange,
  theme,
  scheme,
}: {
  view: KloqView;
  onViewChange: (view: KloqView) => void;
  theme: string;
  scheme: "light" | "dark" | undefined;
}) {
  useEffect(() => registerMockAccounts(), []);
  const events = useMemo(() => mockSeedEvents(), []);
  return (
    <Kloq
      view={view}
      onViewChange={onViewChange}
      defaultEvents={events}
      persistence={false}
      defaultDate={busyWeekday()}
      designMode={false}
      theme={theme}
      scheme={scheme}
    >
      <Kloq.Toolbar />
    </Kloq>
  );
}
