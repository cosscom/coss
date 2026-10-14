"use client";

import { useMediaQuery } from "@coss/ui/hooks/use-media-query";
import { Kloq } from "kloq";
import { useEffect, useMemo } from "react";
import { mockSeedEvents, registerMockAccounts } from "@/components/calendar/demo/mock-accounts";
import { busyWeekday } from "./busy-weekday";
import { DesignModeButton } from "./design-mode-button";
import { HERO_HEIGHT } from "./hero-frame";

/** The hero is the product: a real <Kloq> on the demo's seed, ephemeral so playing here never touches /demo's store. */
export function HeroCalendar() {
  useEffect(() => registerMockAccounts(), []);
  const events = useMemo(() => mockSeedEvents(), []);
  const phone = useMediaQuery("max-sm");
  return (
    <div className={`${HERO_HEIGHT} [&_[data-craft=edge-scroll]]:overscroll-auto`}>
      <Kloq
        key={phone ? "day" : "week"}
        defaultEvents={events}
        persistence={false}
        defaultView={phone ? "day" : "week"}
        defaultDate={phone ? busyWeekday() : undefined}
        responsive={!phone}
        designMode={{ hint: false }}
      >
        <Kloq.Toolbar>
          <Kloq.Nav />
          <div className="flex items-center gap-2">
            <DesignModeButton />
            <Kloq.Reset />
          </div>
        </Kloq.Toolbar>
      </Kloq>
    </div>
  );
}
