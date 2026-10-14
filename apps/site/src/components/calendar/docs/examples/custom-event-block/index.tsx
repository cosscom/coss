"use client";

import { cn } from "@coss/ui/lib/utils";
import {
  continuesAfter,
  continuesBefore,
  EVENT_COLORS,
  type EventBlockProps,
  formatDurationShort,
  Kloq,
  useKloqSettings,
} from "kloq";
import { CircleCheck, CircleX, Clock, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Dot } from "../parts";
import { type DeployStatus, deployById, deployEvents, STATUS_COLOR } from "./data";

const STATUS_ICON = {
  passed: CircleCheck,
  running: LoaderCircle,
  failed: CircleX,
  queued: Clock,
} satisfies Record<DeployStatus, typeof Clock>;

function DeployBlock({
  event,
  dayCount,
  dayNamesShort,
  layout,
  selected,
  tabIndex,
  registerNode,
  onPointerDown,
  onActivate,
}: EventBlockProps) {
  const g = useKloqSettings();
  const status = deployById.get(event.source.id)?.status ?? "queued";
  const Icon = STATUS_ICON[status];
  const c = EVENT_COLORS[event.color];
  const cutTop = continuesBefore(event);
  const cutBottom = continuesAfter(event);

  const time = g.formatRange(event.startMin, event.endMin);
  const height = g.durationToPx(event.endMin - event.startMin);
  const slice = 100 / dayCount / layout.cols;
  const left = (event.dayIndex * layout.cols + layout.col) * slice;
  const compact = height < 44;
  const label =
    `${event.title}, ${status}, ${dayNamesShort[event.dayIndex]}, ${time}` +
    (cutTop ? ", continued from the previous day" : "") +
    (cutBottom ? ", continues" : "");

  return (
    <div
      data-cal-event={event.id}
      ref={(node) => registerNode(event.id, node)}
      onPointerDown={(e) => onPointerDown(e, event)}
      onClick={(e) => {
        if (e.detail === 0) onActivate?.(event);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate?.(event);
        }
      }}
      role="button"
      aria-pressed={selected}
      aria-label={label}
      tabIndex={tabIndex ?? (selected ? 0 : -1)}
      data-selected={selected || undefined}
      className={cn(
        "group pointer-events-auto absolute z-10 cursor-grab touch-none select-none rounded-md border bg-card text-foreground shadow-xs outline-none transition-shadow duration-150",
        "focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        cutTop && "rounded-t-none border-t-0",
        cutBottom && "rounded-b-none border-b-0",
        selected && cn("z-20 ring-2 ring-offset-1 ring-offset-background", c.ring),
      )}
      style={{
        top: g.minutesToPx(event.startMin),
        height: Math.max(height - 2, 14),
        left: `calc(${left}% + 2px)`,
        width: `calc(${slice}% - 5px)`,
      }}
    >
      {/* text and the stripe clip here; the resize zones below sit outside the box */}
      <div className="@container absolute inset-0 overflow-hidden rounded-[inherit]">
        <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", c.bar)} />
        <div
          className={cn(
            "flex h-full min-w-0 flex-col pl-3 pr-2",
            compact ? "justify-center" : "justify-between py-1.5",
          )}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <Icon
              aria-hidden
              className={cn("size-3 shrink-0", status === "running" && "motion-safe:animate-spin")}
            />
            <span className="min-w-0 truncate text-xs font-medium leading-none">{event.title}</span>
            {/* a short block has one line: the time gives way to the title until the block is wide enough for both */}
            {compact ? (
              <span
                data-slot="event-time"
                className="ml-auto hidden shrink-0 font-mono text-3xs text-muted-foreground tabular-nums @3xs:inline"
              >
                {time}
              </span>
            ) : null}
          </div>
          {compact ? null : (
            <div className="flex items-baseline justify-between gap-2 font-mono text-3xs text-muted-foreground tabular-nums">
              <span data-slot="event-time" className="truncate">
                {time}
              </span>
              <span className="shrink-0">{formatDurationShort(event.endMin - event.startMin)}</span>
            </div>
          )}
        </div>
        {status === "running" ? (
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-border">
            <span className={cn("block h-full w-3/5 motion-safe:animate-pulse", c.bar)} />
          </span>
        ) : null}
      </div>

      {cutTop ? null : (
        <div
          aria-hidden
          data-resize-edge="start"
          className="absolute -top-1 left-0 right-0 h-2 cursor-ns-resize pointer-coarse:-top-3 pointer-coarse:h-6"
        />
      )}
      {cutBottom ? null : (
        <div
          aria-hidden
          data-resize-edge="end"
          className="absolute -bottom-1 left-0 right-0 h-2 cursor-ns-resize pointer-coarse:-bottom-3 pointer-coarse:h-6"
        />
      )}
    </div>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
      {(Object.keys(STATUS_COLOR) as DeployStatus[]).map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <Dot className={EVENT_COLORS[STATUS_COLOR[status]].bar} />
          {status}
        </li>
      ))}
    </ul>
  );
}

const SLOTS = { EventBlock: DeployBlock };

export default function CustomEventBlockExample() {
  const [events] = useState(() => deployEvents(new Date()));
  return (
    <div className="@container flex flex-col">
      <div className="h-136">
        <Kloq
          defaultEvents={events}
          defaultView={3}
          components={SLOTS}
          workingHours={false}
          persistence={false}
          designMode={false}
          storage={false}
        >
          <Kloq.Toolbar>
            <Kloq.Nav />
            <Legend />
          </Kloq.Toolbar>
        </Kloq>
      </div>
    </div>
  );
}
