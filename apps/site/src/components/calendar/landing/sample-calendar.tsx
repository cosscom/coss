"use client";

import { Frame, FramePanel } from "@coss/ui/components/frame";
import { cn } from "@coss/ui/lib/utils";
import dynamic from "next/dynamic";
import { LazyMount } from "@/components/calendar/docs/ui/lazy-mount";
import { CalendarFrame, THREE_FROM_WED } from "./calendar-frame";

const frame = (
  <CalendarFrame
    phone={THREE_FROM_WED}
    narrow={THREE_FROM_WED}
    wide={THREE_FROM_WED}
    className="h-full"
  />
);

const Live = dynamic(() => import("./sample-calendar-live").then((m) => m.SampleCalendarLive), {
  ssr: false,
  loading: () => frame,
});

/** A seeded three-day calendar for the install section: what the snippet beside it produces. Loads when it nears the viewport. */
export function SampleCalendar({ className }: { className?: string }) {
  return (
    <Frame className={cn("h-104", className)}>
      <FramePanel className="min-h-0 flex-1 overflow-clip p-0">
        <LazyMount className="h-full" near="600px 0px" far="100000px 0px" placeholder={frame}>
          <Live />
        </LazyMount>
      </FramePanel>
    </Frame>
  );
}
