"use client";

import { useMediaQuery } from "@coss/ui/hooks/use-media-query";
import { Kloq } from "kloq";
import { useEffect, useMemo } from "react";
import { mockSeedEvents, registerMockAccounts } from "@/components/calendar/demo/mock-accounts";
import { busyWeekday } from "@/components/calendar/landing/busy-weekday";

/* Above `sm` the box is never forced down to one day: three days under 900px of box, a week above —
   the views the static frame in calendar-slot.tsx draws. */
const FROM_SM = { breakpoint: 1 };

/** Client-only (see calendar-slot.tsx). A phone gets the seed's busiest day; the switcher names what is drawn. */
export function HomeCalendar() {
  useEffect(() => registerMockAccounts(), []);
  const events = useMemo(() => mockSeedEvents(), []);
  const phone = useMediaQuery("max-sm");
  return (
    <Kloq
      key={phone ? "day" : "week"}
      defaultEvents={events}
      persistence={false}
      defaultView={phone ? "day" : "week"}
      defaultDate={phone ? busyWeekday() : undefined}
      responsive={phone ? false : FROM_SM}
      designMode={{ hint: false }}
    >
      <Kloq.Toolbar>
        <Kloq.Nav />
        <Kloq.Reset />
      </Kloq.Toolbar>
    </Kloq>
  );
}
