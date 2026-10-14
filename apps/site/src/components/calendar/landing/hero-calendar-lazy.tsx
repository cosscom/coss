"use client";

import dynamic from "next/dynamic";
import { HeroFrame } from "./hero-frame";

export const HeroCalendarLazy = dynamic(
  () => import("./hero-calendar").then((m) => m.HeroCalendar),
  {
    ssr: false,
    loading: () => <HeroFrame />,
  },
);
