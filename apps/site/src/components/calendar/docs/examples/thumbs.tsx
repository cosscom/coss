import { Kbd } from "@coss/ui/components/kbd";
import { cn } from "@coss/ui/lib/utils";
import type { CSSProperties, ReactNode } from "react";

/**
 * Gallery thumbnails: one static schematic per example, drawn from tokens. Nothing here mounts a
 * calendar, so a card costs a few dozen elements and cannot touch the page it sits on.
 */

type Tone = "plain" | "strong" | "brand";

const TONES: Record<Tone, string> = {
  plain: "border-border bg-muted",
  strong: "border-foreground/40 bg-foreground/10",
  brand: "border-brand bg-brand/15",
};

const pct = (n: number) => `${n * 100}%`;

function Thumb({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex h-44 flex-col overflow-hidden bg-background", className)}>
      {children}
    </div>
  );
}

function Strip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex h-7 shrink-0 items-center gap-2 border-b px-3", className)}>
      {children}
    </div>
  );
}

function Text({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("truncate font-mono text-3xs text-muted-foreground", className)}>
      {children}
    </span>
  );
}

function Line({ className }: { className?: string }) {
  return <span className={cn("h-1.5 w-10 shrink-0 rounded-full bg-muted", className)} />;
}

function Outline({ className }: { className?: string }) {
  return <span className={cn("h-3.5 w-12 shrink-0 rounded-xs border", className)} />;
}

function Segments({ n, on = 0 }: { n: number; on?: number }) {
  return (
    <span className="flex shrink-0 gap-0.5 rounded-sm bg-muted p-0.5">
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className={cn("h-2.5 w-6 rounded-xs", i === on && "bg-background shadow-xs")}
        />
      ))}
    </span>
  );
}

/** Day columns with hour rules; children are positioned in fractions of the body. */
function Grid({
  cols,
  gutter = <span className="w-7 shrink-0 border-r" />,
  children,
  className,
}: {
  cols: number;
  gutter?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-0 flex-1", className)}>
      {gutter}
      <div className="relative min-w-0 flex-1">
        {Array.from({ length: 3 }, (_, i) => (
          <span
            key={`h${i}`}
            className="absolute inset-x-0 h-px bg-border"
            style={{ top: pct((i + 1) / 4) }}
          />
        ))}
        {Array.from({ length: cols - 1 }, (_, i) => (
          <span
            key={`v${i}`}
            className="absolute inset-y-0 w-px bg-border"
            style={{ left: pct((i + 1) / cols) }}
          />
        ))}
        {children}
      </div>
    </div>
  );
}

function box(cols: number, col: number, y: number, h: number, w = 1): CSSProperties {
  return { left: pct(col / cols), width: pct(w / cols), top: pct(y), height: pct(h) };
}

function Ev({
  cols,
  col,
  y,
  h,
  w,
  tone = "plain",
  className,
}: {
  cols: number;
  col: number;
  y: number;
  h: number;
  w?: number;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span className="absolute p-0.5" style={box(cols, col, y, h, w)}>
      <span className={cn("block h-full rounded-xs border-l-2", TONES[tone], className)} />
    </span>
  );
}

function Hatch({ cols, col, y, h }: { cols: number; col: number; y: number; h: number }) {
  return (
    <span
      className="absolute bg-muted/40"
      style={{
        ...box(cols, col, y, h),
        backgroundImage:
          "repeating-linear-gradient(135deg, var(--border) 0 1px, transparent 1px 5px)",
      }}
    />
  );
}

/** Timeline rows: a label column and one track per lane. */
function Lanes({ lanes, children }: { lanes: number; children?: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex w-1/4 shrink-0 flex-col border-r">
        {Array.from({ length: lanes }, (_, i) => (
          <span
            key={i}
            className="flex flex-1 flex-col justify-center gap-1 border-b px-3 last:border-b-0"
          >
            <Line className="w-10 bg-foreground/20" />
            <Line className="w-6" />
          </span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        {Array.from({ length: lanes - 1 }, (_, i) => (
          <span
            key={`h${i}`}
            className="absolute inset-x-0 h-px bg-border"
            style={{ top: pct((i + 1) / lanes) }}
          />
        ))}
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={`v${i}`}
            className="absolute inset-y-0 w-px bg-border"
            style={{ left: pct((i + 1) / 6) }}
          />
        ))}
        {children}
      </div>
    </div>
  );
}

function Shift({
  lanes,
  lane,
  x,
  w,
  tone = "plain",
}: {
  lanes: number;
  lane: number;
  x: number;
  w: number;
  tone?: Tone;
}) {
  return (
    <span
      className="absolute px-0.5 py-2"
      style={{ top: pct(lane / lanes), height: pct(1 / lanes), left: pct(x), width: pct(w) }}
    >
      <span className={cn("block h-full rounded-xs border-l-2", TONES[tone])} />
    </span>
  );
}

const WEEK: [col: number, y: number, h: number, tone?: Tone][] = [
  [0, 0.3, 0.12],
  [1, 0.3, 0.12],
  [1, 0.55, 0.25, "strong"],
  [2, 0.3, 0.12],
  [2, 0.5, 0.35],
  [3, 0.3, 0.12],
  [4, 0.3, 0.12],
  [4, 0.7, 0.2, "strong"],
];

function Week({ extra }: { extra?: ReactNode }) {
  return (
    <Grid cols={7}>
      {WEEK.map(([col, y, h, tone], i) => (
        <Ev key={i} cols={7} col={col} y={y} h={h} tone={tone} />
      ))}
      {extra}
    </Grid>
  );
}

const THUMBS: Record<string, () => ReactNode> = {
  "booking-page": () => (
    <Thumb className="flex-row">
      <div className="flex w-2/5 shrink-0 flex-col gap-2 border-r p-3">
        <Text>book a call</Text>
        <Line className="h-2 w-20 bg-foreground/40" />
        <Line className="w-14" />
        <span className="my-1 h-px bg-border" />
        <Outline className="w-full" />
        <Outline className="w-full" />
        <span className="h-3.5 w-12 rounded-xs bg-primary" />
      </div>
      <Grid cols={3}>
        <Hatch cols={3} col={0} y={0} h={0.5} />
        <Hatch cols={3} col={0} y={0.75} h={0.25} />
        <Hatch cols={3} col={1} y={0.2} h={0.3} />
        <Hatch cols={3} col={2} y={0} h={0.12} />
        <Hatch cols={3} col={2} y={0.5} h={0.3} />
        <Hatch cols={3} col={1} y={0.75} h={0.25} />
        <Ev cols={3} col={2} y={0.18} h={0.2} tone="brand" />
      </Grid>
    </Thumb>
  ),
  "team-schedule": () => (
    <Thumb>
      <div className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-2 border-b px-3 py-2.5">
        {["bg-foreground/70", "bg-foreground/40", "bg-foreground/70", "bg-brand", "border"].map(
          (fill, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className={cn("size-2.5 shrink-0 rounded-xs", fill)} />
              <Line className={i % 2 ? "w-16" : "w-12"} />
            </span>
          ),
        )}
      </div>
      <Week extra={<Ev cols={7} col={3} y={0.5} h={0.3} tone="brand" />} />
    </Thumb>
  ),
  "room-booking": () => (
    <Thumb>
      <Lanes lanes={4}>
        <Shift lanes={4} lane={0} x={0.55} w={0.12} />
        <Shift lanes={4} lane={1} x={0.15} w={0.34} tone="strong" />
        <Shift lanes={4} lane={1} x={0.62} w={0.18} />
        <Shift lanes={4} lane={2} x={0.15} w={0.06} />
        <Shift lanes={4} lane={2} x={0.5} w={0.17} tone="brand" />
        <Shift lanes={4} lane={3} x={0.08} w={0.6} />
      </Lanes>
    </Thumb>
  ),
  "shift-roster": () => (
    <Thumb>
      <Lanes lanes={5}>
        <Shift lanes={5} lane={0} x={0.05} w={0.4} tone="strong" />
        <Shift lanes={5} lane={1} x={0.45} w={0.4} />
        <Shift lanes={5} lane={2} x={0} w={1} tone="brand" />
        <Shift lanes={5} lane={3} x={0.35} w={0.4} />
        <Shift lanes={5} lane={4} x={0.25} w={0.4} tone="strong" />
      </Lanes>
    </Thumb>
  ),
  "conference-agenda": () => (
    <Thumb>
      <Strip className="justify-between">
        <Text className="text-foreground">KinetiConf</Text>
        <Segments n={2} />
      </Strip>
      <div className="flex h-5 shrink-0 items-center border-b bg-muted/40 px-3">
        <Text>Wednesday</Text>
      </div>
      {["09:00", "09:30", "10:30", "12:00", "13:00"].map((time, i) => (
        <div key={time} className="flex flex-1 items-center gap-3 border-b px-3 last:border-b-0">
          <Text className="w-8 shrink-0 tabular-nums">{time}</Text>
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              i === 1 ? "bg-brand" : "bg-foreground/30",
            )}
          />
          <Line className={cn("bg-foreground/20", i % 2 ? "w-24" : "w-16")} />
          <Line className="ms-auto w-8" />
        </div>
      ))}
    </Thumb>
  ),
  "app-shell": () => (
    <Thumb className="flex-row">
      <div className="flex w-1/4 shrink-0 flex-col gap-1 border-r bg-muted/32 p-2">
        <span className="mb-1 flex items-center gap-1.5 px-1">
          <span className="size-2 rounded-xs bg-brand" />
          <Line className="w-8 bg-foreground/40" />
        </span>
        {[false, false, true, false].map((active, i) => (
          <span
            key={i}
            className={cn("flex h-4 items-center rounded-xs px-1", active && "bg-accent")}
          >
            <Line className={active ? "w-10 bg-foreground/40" : "w-8"} />
          </span>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Strip className="justify-between">
          <Line className="h-2 w-12 bg-foreground/40" />
          <span className="flex items-center gap-2">
            <Segments n={3} on={1} />
            <span className="size-3.5 rounded-full bg-muted" />
          </span>
        </Strip>
        <Grid cols={3}>
          <Ev cols={3} col={0} y={0.15} h={0.1} />
          <Ev cols={3} col={0} y={0.45} h={0.3} tone="strong" />
          <Ev cols={3} col={1} y={0.15} h={0.1} />
          <Ev cols={3} col={1} y={0.3} h={0.15} />
          <Ev cols={3} col={2} y={0.15} h={0.1} />
          <Ev cols={3} col={2} y={0.6} h={0.35} tone="brand" />
        </Grid>
      </div>
    </Thumb>
  ),
  "server-sync": () => (
    <Thumb>
      <Strip>
        <span className="relative h-0.5 w-16 shrink-0 rounded-full bg-foreground/40">
          <span className="absolute -top-1 right-2 size-2.5 rounded-full border bg-background" />
        </span>
        <span className="flex h-2.5 w-4.5 shrink-0 items-center justify-end rounded-full bg-primary px-0.5">
          <span className="size-1.5 rounded-full bg-background" />
        </span>
        <Text className="ms-auto">syncing 1…</Text>
      </Strip>
      <Week
        extra={
          <Ev cols={7} col={3} y={0.5} h={0.3} tone="brand" className="motion-safe:animate-pulse" />
        }
      />
      <div className="flex shrink-0 flex-col gap-0.5 border-t px-3 py-1.5">
        <Text>
          #2 update <span className="text-destructive-foreground">rejected → reverted</span>
        </Text>
        <Text>#1 update ok</Text>
      </div>
    </Thumb>
  ),
  "range-fetching": () => (
    <Thumb>
      <Grid cols={7}>
        {WEEK.filter(([col]) => col > 1 && col < 5).map(([col, y, h, tone], i) => (
          <Ev key={i} cols={7} col={col} y={y} h={h} tone={tone} />
        ))}
        <span
          className="absolute inset-y-0 border-x border-dashed border-brand bg-brand/5"
          style={{ left: pct(2 / 7), width: pct(3 / 7) }}
        />
      </Grid>
      <div className="flex shrink-0 flex-col gap-0.5 border-t px-3 py-1.5">
        <Text className="text-foreground">96 of 300 events loaded · 3 requests</Text>
        <Text>#3 … #2 61 events #1 54 events</Text>
      </div>
    </Thumb>
  ),
  "url-state": () => (
    <Thumb>
      <Week />
      <Strip className="justify-between border-t border-b-0">
        <Text>
          <span className="text-foreground">?view=week&amp;date=2026-10-12</span>
        </Text>
        <Outline />
      </Strip>
    </Thumb>
  ),
  "custom-persistence": () => (
    <Thumb>
      <Strip>
        <Segments n={2} />
        <Text>
          <span className="text-foreground">kloq-example:acme:events</span>
        </Text>
      </Strip>
      <Week />
    </Thumb>
  ),
  "ics-import-export": () => (
    <Thumb>
      <Strip>
        <Outline className="w-16" />
        <Outline className="w-16" />
        <Outline className="w-16" />
      </Strip>
      <Week
        extra={
          <span className="absolute right-3 bottom-3 rounded-xs border border-dashed border-brand bg-background px-2 py-1">
            <Text className="text-foreground">feed.ics</Text>
          </span>
        }
      />
      <Strip className="border-t border-b-0">
        <Text>
          <span className="text-success-foreground">✓</span> 5 added · 3 skipped · 1 warning
        </Text>
      </Strip>
    </Thumb>
  ),
  "custom-event-block": () => (
    <Thumb>
      <Grid cols={3}>
        {(
          [
            [0, 0.1, 0.2, "plain", false],
            [0, 0.4, 0.3, "brand", true],
            [1, 0.2, 0.2, "strong", false],
            [1, 0.55, 0.35, "plain", false],
            [2, 0.3, 0.2, "strong", false],
          ] as const
        ).map(([col, y, h, tone, running], i) => (
          <span key={i} className="absolute p-0.5" style={box(3, col, y, h)}>
            <span className="relative flex h-full flex-col justify-between overflow-hidden rounded-xs border bg-card py-1 pr-1.5 pl-2.5 shadow-xs">
              <span
                className={cn(
                  "absolute inset-y-0 left-0 w-1",
                  tone === "brand"
                    ? "bg-brand"
                    : tone === "strong"
                      ? "bg-foreground/50"
                      : "bg-foreground/20",
                )}
              />
              <Line className="w-8 bg-foreground/30" />
              <Line className="w-12" />
              {running && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-border">
                  <span className="block h-full w-3/5 bg-brand" />
                </span>
              )}
            </span>
          </span>
        ))}
      </Grid>
    </Thumb>
  ),
  "multi-timezone": () => (
    <Thumb>
      <Grid
        cols={3}
        gutter={
          <span className="grid w-1/2 shrink-0 grid-cols-3 content-around border-r px-2">
            {[
              "3 AM",
              "4 PM",
              "8 AM",
              "4 AM",
              "5 PM",
              "9 AM",
              "5 AM",
              "6 PM",
              "10 AM",
              "6 AM",
              "7 PM",
              "11 AM",
            ].map((t, i) => (
              <Text
                key={i}
                className={cn("text-end tabular-nums", i % 3 === 2 && "text-foreground")}
              >
                {t}
              </Text>
            ))}
          </span>
        }
      >
        <Ev cols={3} col={0} y={0.5} h={0.25} tone="strong" />
        <Ev cols={3} col={1} y={0.3} h={0.4} />
        <Ev cols={3} col={2} y={0.6} h={0.25} tone="brand" />
      </Grid>
    </Thumb>
  ),
  "linked-calendars": () => (
    <Thumb className="flex-row">
      <div className="grid w-1/2 shrink-0 grid-cols-7 grid-rows-5 border-r">
        {Array.from({ length: 35 }, (_, i) => (
          <span
            key={i}
            className="flex items-start justify-end border-r border-b p-1 nth-[7n]:border-r-0 nth-[n+29]:border-b-0"
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                i === 17 ? "bg-brand" : i % 4 === 1 ? "bg-foreground/30" : "bg-transparent",
              )}
            />
          </span>
        ))}
      </div>
      <Grid cols={1}>
        <Ev cols={1} col={0} y={0.12} h={0.1} />
        <Ev cols={1} col={0} y={0.3} h={0.25} tone="brand" />
        <Ev cols={1} col={0} y={0.7} h={0.2} tone="strong" />
      </Grid>
    </Thumb>
  ),
  "recurring-events": () => (
    <Thumb>
      <Strip>
        <Segments n={3} />
        <Text className="text-foreground">FREQ=WEEKLY;INTERVAL=2</Text>
      </Strip>
      <Grid cols={7}>
        {[0, 1, 3, 4].map((col) => (
          <Ev key={col} cols={7} col={col} y={0.25} h={0.14} tone="brand" />
        ))}
        <Ev cols={7} col={2} y={0.6} h={0.14} tone="brand" className="border-dashed" />
        <Ev cols={7} col={3} y={0.55} h={0.3} tone="strong" />
      </Grid>
    </Thumb>
  ),
  "commands-and-keys": () => (
    <Thumb className="relative">
      <Week />
      <div className="absolute inset-x-8 top-5 flex flex-col rounded-md border bg-popover shadow-lg">
        <span className="flex items-center justify-between border-b px-2.5 py-1.5">
          <Text className="text-foreground">focus</Text>
          <Kbd>⌘K</Kbd>
        </span>
        <span className="m-1 rounded-xs bg-accent px-1.5 py-1">
          <Text className="text-foreground">Book a focus block</Text>
        </span>
        <span className="mx-1 mb-1 px-1.5 py-1">
          <Text>Jump to the next standup</Text>
        </span>
      </div>
    </Thumb>
  ),
  "quick-add-planner": () => (
    <Thumb>
      <Strip className="h-9">
        <span className="truncate text-xs text-foreground">
          Lunch with Sam{" "}
          {[
            ["friday", "decoration-solid decoration-info bg-info/12"],
            ["1pm", "decoration-double decoration-brand bg-brand/12"],
            ["at Dishoom", "decoration-dashed decoration-warning bg-warning/16"],
          ].map(([token, mark]) => (
            <span
              key={token}
              className={cn("me-1 rounded-xs underline decoration-2 underline-offset-4", mark)}
            >
              {token}
            </span>
          ))}
        </span>
      </Strip>
      <Week extra={<Ev cols={7} col={4} y={0.5} h={0.14} tone="brand" />} />
    </Thumb>
  ),
};

export function ExampleThumb({ name }: { name: string }) {
  const draw = THUMBS[name];
  return draw ? <div aria-hidden>{draw()}</div> : null;
}
