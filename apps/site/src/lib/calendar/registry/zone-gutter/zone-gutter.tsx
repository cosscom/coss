"use client";

/**
 * Zone gutter (pro) — a time axis with extra columns for any IANA zones,
 * DST-correct against the day the axis represents.
 *
 * The slot contract in one rule: position every label with the `minutesToPx`
 * the grid hands in, never a re-derived scale. The represented day arrives
 * as `date` (or `useGutterDate()` when the prop is absent) — offsets are
 * computed against THAT day, so the week of a DST changeover reads right.
 *
 * Usage:
 *   const TokyoBerlinGutter = makeZoneGutter(["Asia/Tokyo", "Europe/Berlin"]);
 *   <Kloq components={{ TimeGutter: TokyoBerlinGutter }} />
 */

import { type TimeGutterProps, useGutterDate } from "kloq";
import type { ComponentType } from "react";

function zoneShortName(zone: string, on: Date): string {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    timeZoneName: "short",
  })
    .formatToParts(on)
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? zone.split("/").pop() ?? zone;
}

function hourInZone(zone: string, day: Date, hour: number): string {
  // The represented day at this wall hour, read on the host's clock. For a
  // host running the browser's own zone (the common case) this is exact;
  // pair with coss calendar's built-in multi-zone gutter when using displayTimeZone.
  const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour: "numeric",
    hour12: true,
  }).format(at);
}

export function makeZoneGutter(zones: string[]): ComponentType<TimeGutterProps> {
  function ZoneGutter({
    minutesToPx,
    startHour,
    endHour,
    height,
    formatHour,
    date,
  }: TimeGutterProps) {
    const contextDate = useGutterDate();
    const day = date ?? contextDate ?? new Date();
    const hours: number[] = [];
    for (let h = Math.max(1, startHour); h < endHour; h++) hours.push(h);
    const local = (h: number) => (formatHour ? formatHour(h) : `${h}:00`);
    const width = `${3.5 + zones.length * 3.25}rem`;

    return (
      <div aria-hidden className="relative shrink-0 select-none" style={{ height, width }}>
        <span className="absolute inset-x-0 top-1 flex justify-between px-2 text-[9px] font-medium uppercase tracking-wide text-muted-foreground/50">
          {zones.map((zone) => (
            <span key={zone}>{zoneShortName(zone, day)}</span>
          ))}
          <span>local</span>
        </span>
        {hours.map((hour) => (
          <span
            key={hour}
            className="absolute inset-x-0 flex -translate-y-1/2 items-baseline justify-between px-2 text-[11px] tabular-nums"
            style={{ top: minutesToPx(hour * 60) }}
          >
            {zones.map((zone) => (
              <span key={zone} className="text-muted-foreground/45">
                {hourInZone(zone, day, hour)}
              </span>
            ))}
            <span className="pr-0.5 text-muted-foreground/70">{local(hour)}</span>
          </span>
        ))}
      </div>
    );
  }
  return ZoneGutter;
}
