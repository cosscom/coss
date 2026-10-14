"use client";

import dynamic from "next/dynamic";
import {
  CalendarFrame,
  THREE_FROM_TODAY,
  WEDNESDAY,
  WEEK,
} from "@/components/calendar/landing/calendar-frame";

const HEIGHT = "h-104";

/* Client-only: the view depends on the box's width, which the server cannot know. Until the engine
   mounts (and with JS off) the slot shows the static frame of the view each width will get. */
const HomeCalendar = dynamic(() => import("./home-calendar").then((m) => m.HomeCalendar), {
  ssr: false,
  loading: () => (
    <CalendarFrame phone={WEDNESDAY} narrow={THREE_FROM_TODAY} wide={WEEK} className={HEIGHT} />
  ),
});

export function CalendarSlot() {
  return (
    <div
      className={`${HEIGHT} overflow-hidden rounded-xl border bg-card shadow-sm [&_[data-craft=edge-scroll]]:overscroll-auto`}
    >
      <HomeCalendar />
    </div>
  );
}
