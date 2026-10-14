"use client";

/**
 * UTC gutter — a two-column time axis (UTC + local) for the TimeGutter slot.
 *
 * The slot contract in one rule: position every label with the `minutesToPx`
 * the grid hands in, never a re-derived scale, and the axis cannot drift
 * from the engine's math.
 *
 * Usage:
 *   <Kloq components={{ TimeGutter: UtcGutter }} />
 */

import type { TimeGutterProps } from "kloq";

const fmtHour = (h24: number) => {
  const h = ((h24 % 24) + 24) % 24;
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
};

export function UtcGutter({ minutesToPx, startHour, endHour, height }: TimeGutterProps) {
  // UTC offset in whole hours (fractional zones round)
  const offset = Math.round(new Date().getTimezoneOffset() / 60);
  const hours: number[] = [];
  for (let h = Math.max(1, startHour); h < endHour; h++) hours.push(h);

  return (
    <div aria-hidden className="relative w-24 shrink-0 select-none" style={{ height }}>
      <span className="absolute left-2 top-1 text-[9px] font-medium uppercase tracking-wide text-muted-foreground/50">
        UTC
      </span>
      <span className="absolute right-2.5 top-1 text-[9px] font-medium uppercase tracking-wide text-muted-foreground/50">
        local
      </span>
      {hours.map((hour) => (
        <span
          key={hour}
          className="absolute inset-x-0 flex -translate-y-1/2 items-baseline justify-between px-2 text-[11px] tabular-nums"
          style={{ top: minutesToPx(hour * 60) }}
        >
          <span className="text-muted-foreground/45">{fmtHour(hour + offset)}</span>
          <span className="pr-0.5 text-muted-foreground/70">{fmtHour(hour)}</span>
        </span>
      ))}
    </div>
  );
}
