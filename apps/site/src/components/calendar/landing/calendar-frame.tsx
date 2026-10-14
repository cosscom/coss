import { Kbd } from "@coss/ui/components/kbd";
import { cn } from "@coss/ui/lib/utils";
import { ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { MiniEvent, type MiniEventColor } from "./mini-event";

/*
 * What paints before a calendar's bundle arrives: the same toolbar, header rows, gutter and
 * hour grid as the real thing, with the seed's weekday events where the view is known ahead
 * of time. A view that starts on "today" (`days: null`) draws the grid only.
 */

const DAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR = 64;
const TOP_MINUTE = 7.5 * 60;
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15];

type Block = {
  day: number;
  start: number;
  end: number;
  title: string;
  color: MiniEventColor;
  half?: boolean;
};

const TIMED: Block[] = [
  ...[0, 1, 2, 3, 4].map(
    (day): Block => ({ day, start: 540, end: 570, title: "Standup", color: "violet" }),
  ),
  { day: 1, start: 780, end: 840, title: "Design review", color: "violet" },
  { day: 2, start: 600, end: 690, title: "Deep work", color: "blue" },
  { day: 2, start: 900, end: 945, title: "Interview — staff eng", color: "amber", half: true },
  { day: 3, start: 570, end: 600, title: "1:1 with Ryan", color: "violet" },
  { day: 4, start: 720, end: 780, title: "Lunch with Sam", color: "blue" },
];

const ALL_DAY: { day: number; span: number; title: string; color: MiniEventColor }[] = [
  { day: 0, span: 1, title: "Bank holiday", color: "emerald" },
  { day: 3, span: 2, title: "OOO — Croatia", color: "blue" },
];

const clock = (minute: number) => {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
};
const hourLabel = (h: number) => `${((h + 11) % 12) + 1} ${h < 12 ? "AM" : "PM"}`;

export type FrameView = {
  /** Monday-based day indexes, or null for a view that starts on the visitor's today */
  days: number[] | null;
  label: string;
};

type Chrome = "hero" | "plain";

function Toolbar({ label, chrome, phone }: { label: string; chrome: Chrome; phone: boolean }) {
  const arrows = (
    <span className="flex text-muted-foreground">
      <ChevronLeft className={phone ? "size-7 p-1.75" : "size-6 p-1.25"} />
      <ChevronRight className={phone ? "size-7 p-1.75" : "size-6 p-1.25"} />
    </span>
  );
  const view = (
    <span
      className={cn(
        "flex items-center justify-between gap-1 rounded-md border px-2 font-medium",
        phone ? "h-7 text-sm" : "h-6 w-24 text-xs",
      )}
    >
      {label}
      <ChevronDown className="size-3.5 text-muted-foreground" />
    </span>
  );
  const designMode = chrome === "hero" && (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border bg-popover px-2 text-sm font-medium shadow-xs",
        phone ? "h-8" : "h-7",
      )}
    >
      <Kbd>⌥</Kbd>
      <Kbd>D</Kbd>
      {!phone && <span>design mode</span>}
      <span className="size-1.5 rounded-full bg-muted-foreground/30" />
    </span>
  );
  const reset = (
    <span
      className={cn(
        "flex items-center gap-1 font-medium text-muted-foreground",
        phone ? "size-7 justify-center" : "px-2 text-xs",
      )}
    >
      <RotateCcw className="size-3.5" />
      {!phone && "Reset"}
    </span>
  );
  return phone ? (
    <div className="flex h-22.25 shrink-0 flex-col justify-center gap-2 border-b px-4">
      <div className="flex items-center gap-2">
        {arrows}
        <span className="h-3.5 flex-1 rounded-sm bg-muted" />
        {view}
      </div>
      <div className="flex items-center gap-2">
        {designMode}
        {reset}
      </div>
    </div>
  ) : (
    <div className="flex h-12.25 shrink-0 items-center justify-between border-b px-4">
      <div className="flex items-center gap-2">
        {arrows}
        <span className="px-2 text-xs font-medium text-muted-foreground">Today</span>
        <span className="flex h-6 w-24 items-center">
          <span className="h-3 w-20 rounded-sm bg-muted" />
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="mr-2">{view}</span>
        {designMode}
        {reset}
      </div>
    </div>
  );
}

function Grid({
  view,
  chrome,
  phone,
  className,
}: {
  view: FrameView;
  chrome: Chrome;
  phone: boolean;
  className?: string;
}) {
  const cols: (number | null)[] = view.days ?? [null, null, null];
  const last = view.days ? view.days[view.days.length - 1] : -1;
  return (
    <div className={cn("flex h-full flex-col", className)}>
      <Toolbar label={view.label} chrome={chrome} phone={phone} />
      <div className="grid h-9.25 shrink-0 auto-cols-fr grid-flow-col border-b pl-16">
        {cols.map((day, i) => (
          <div
            key={i}
            className="flex items-center border-l px-2.5 text-xs font-medium text-muted-foreground"
          >
            {day != null && DAY[day]}
          </div>
        ))}
      </div>
      <div className="flex h-7.75 shrink-0 border-b">
        <div className="flex w-16 shrink-0 items-center justify-end pr-2.5 text-2xs text-muted-foreground">
          All day
        </div>
        <div className="grid flex-1 auto-cols-fr grid-flow-col">
          {cols.map((day, i) => (
            <div key={i} className="relative border-l">
              {ALL_DAY.filter((e) => e.day === day).map((e) => (
                <MiniEvent
                  key={e.title}
                  color={e.color}
                  title={e.title}
                  inline
                  className="absolute top-0.75 left-0.5 z-10 h-5.5 py-0.5"
                  style={{ width: `calc(${Math.min(e.span, last - e.day + 1) * 100}% - 5px)` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 overflow-clip">
        <div className="relative w-16 shrink-0">
          {HOURS.map((h) => (
            <span
              key={h}
              className="absolute right-2.5 -translate-y-1/2 text-2xs text-muted-foreground"
              style={{ top: ((h * 60 - TOP_MINUTE) / 60) * HOUR }}
            >
              {hourLabel(h)}
            </span>
          ))}
        </div>
        <div className="relative grid flex-1 auto-cols-fr grid-flow-col">
          <div className="absolute inset-x-0 top-0 h-24 bg-muted/40" />
          {HOURS.map((h) => (
            <div
              key={h}
              className="absolute inset-x-0 border-t"
              style={{ top: ((h * 60 - TOP_MINUTE) / 60) * HOUR }}
            />
          ))}
          {cols.map((day, i) => (
            <div key={i} className="relative border-l">
              {TIMED.filter((e) => e.day === day).map((e) => {
                const short = e.end - e.start <= 30;
                return (
                  <MiniEvent
                    key={e.title}
                    color={e.color}
                    title={e.title}
                    time={`${clock(e.start)} – ${clock(e.end)}`}
                    inline={short}
                    roomy={!short}
                    className={cn(
                      "absolute left-0.5 overflow-clip",
                      e.half ? "right-1/2" : "right-0.75",
                      short && "py-1.5",
                    )}
                    style={{
                      top: ((e.start - TOP_MINUTE) / 60) * HOUR,
                      height: ((e.end - e.start) / 60) * HOUR - 2,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * `phone` shows below `sm`, `narrow` while the box itself is under coss calendar's 900px collapse,
 * `wide` above it. Pass the same view to all three for a calendar that never collapses.
 */
export function CalendarFrame({
  phone,
  narrow,
  wide,
  chrome = "plain",
  className,
}: {
  phone: FrameView;
  narrow: FrameView;
  wide: FrameView;
  chrome?: Chrome;
  className?: string;
}) {
  return (
    <div aria-hidden className={cn("@container relative overflow-clip", className)}>
      <Grid view={phone} chrome={chrome} phone className="sm:hidden" />
      <Grid
        view={narrow}
        chrome={chrome}
        phone={false}
        className="max-sm:hidden @min-[900px]:hidden"
      />
      <Grid view={wide} chrome={chrome} phone={false} className="hidden @min-[900px]:flex" />
    </div>
  );
}

export const WEEK: FrameView = { days: [0, 1, 2, 3, 4, 5, 6], label: "Week" };
export const THREE_FROM_WED: FrameView = { days: [2, 3, 4], label: "3 days" };
export const THREE_FROM_TODAY: FrameView = { days: null, label: "3 days" };
export const WEDNESDAY: FrameView = { days: [2], label: "Day" };
