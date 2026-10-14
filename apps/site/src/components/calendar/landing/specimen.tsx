"use client";

import { Button } from "@coss/ui/components/button";
import { Frame, FramePanel } from "@coss/ui/components/frame";
import { Toggle } from "@coss/ui/components/toggle";
import type { KloqView } from "kloq";
import { THEMES, themeTransition } from "kloq/themes";
import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { LazyMount } from "@/components/calendar/docs/ui/lazy-mount";
import { SegmentedControl, SegmentedControlItem } from "@/components/calendar/ui/segmented-control";
import { CalendarFrame, THREE_FROM_WED, WEDNESDAY, WEEK } from "./calendar-frame";

const frame = (
  <CalendarFrame phone={WEDNESDAY} narrow={THREE_FROM_WED} wide={WEEK} className="h-full" />
);

const Calendar = dynamic(() => import("./specimen-calendar").then((m) => m.SpecimenCalendar), {
  ssr: false,
  loading: () => frame,
});

/* until the visitor pins a scheme, the demo follows the page's `.dark` */
const subscribeDark = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
};
const readDark = () => document.documentElement.classList.contains("dark");
const serverDark = () => false;

const VIEWS: { id: KloqView; label: string }[] = [
  { id: "day", label: "Day" },
  { id: 3, label: "3-day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "agenda", label: "Agenda" },
  { id: "year", label: "Year" },
];

/**
 * One live calendar, re-dressed through the real API: a chip sets the `theme` prop, which
 * scopes the tokens to this instance and its portals. The rest of the page keeps its own.
 */
export function Specimen() {
  const [view, setView] = useState<KloqView>("week");
  const [themeId, setThemeId] = useState("coss");
  const [scheme, setScheme] = useState<"light" | "dark" | undefined>(undefined);
  const siteDark = useSyncExternalStore(subscribeDark, readDark, serverDark);
  const effective = scheme ?? (siteDark ? "dark" : "light");
  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  const origin = theme.origin ?? "light";
  const other = origin !== effective ? origin : effective === "dark" ? "light" : "dark";
  const dress = (id: string, next: "light" | "dark") =>
    themeTransition(() =>
      flushSync(() => {
        setThemeId(id);
        setScheme(next);
      }),
    );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="-my-1 max-w-full overflow-x-auto py-1">
          <SegmentedControl
            size="sm"
            aria-label="View"
            value={String(view)}
            onValueChange={(next) =>
              setView(VIEWS.find((v) => String(v.id) === next)?.id ?? "week")
            }
          >
            {VIEWS.map((v) => (
              <SegmentedControlItem key={String(v.id)} value={String(v.id)}>
                {v.label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </div>
        <p className="flex flex-wrap items-center gap-x-2 font-mono text-xs text-muted-foreground">
          <span>
            {theme.name}
            {theme.credit && theme.credit !== theme.name && ` · ${theme.credit}`}
            {` · ${origin}-first`}
          </span>
          <Button
            size="xs"
            variant="link"
            className="font-mono"
            onClick={() => dress(themeId, other)}
          >
            see it in {other} →
          </Button>
        </p>
      </div>

      <div
        role="group"
        aria-label="Theme"
        className="-mx-6 mt-4 flex gap-2 overflow-x-auto px-6 py-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {THEMES.map((t) => (
          <Toggle
            key={t.id}
            size="sm"
            variant="outline"
            className="shrink-0"
            pressed={t.id === themeId}
            onPressedChange={() => dress(t.id, t.origin ?? "light")}
          >
            <span aria-hidden className="flex -space-x-1">
              {t.swatch.map((c) => (
                <span
                  key={c}
                  className="size-3.5 rounded-full ring-1 ring-border"
                  style={{ background: c }}
                />
              ))}
            </span>
            {t.name}
          </Toggle>
        ))}
      </div>
      <p className="mt-2 font-mono text-xs text-muted-foreground">
        one prop — <span className="text-foreground">{`theme="${themeId}"`}</span> — this calendar
        only; setTheme() when you want the whole site
      </p>

      <Frame className="mt-4 h-104 sm:h-128">
        <FramePanel className="min-h-0 flex-1 overflow-clip p-0 [&_[data-craft=edge-scroll]]:overscroll-auto">
          <LazyMount className="h-full" near="600px 0px" far="100000px 0px" placeholder={frame}>
            <Calendar view={view} onViewChange={setView} theme={themeId} scheme={scheme} />
          </LazyMount>
        </FramePanel>
      </Frame>
    </div>
  );
}
