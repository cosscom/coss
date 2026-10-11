"use client";

import type { LogHistogram } from "@coss/logs";
import { LOG_LEVELS } from "@coss/logs/schemas";
import { useRef, useState } from "react";
import { axisLabel, compactCount, LEVEL_BAR, LEVEL_DOT, LEVEL_LABEL } from "./format";

const HEIGHT = 56;

/**
 * Lines per time bucket, stacked by level. Hover shows a bucket's counts; dragging across buckets
 * (or clicking one) zooms the view into that range.
 */
export function LogHistogramChart(props: {
  histogram: LogHistogram;
  onSelectRange: (from: Date, to: Date) => void;
}) {
  const { buckets, bucketMs } = props.histogram;
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ start: number; end: number } | null>(null);
  const max = Math.max(1, ...buckets.map((bucket) => bucket.info + bucket.warning + bucket.error));

  if (buckets.length === 0) return null;

  function indexAt(clientX: number): number {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    const ratio = (clientX - rect.left) / rect.width;
    return Math.min(buckets.length - 1, Math.max(0, Math.floor(ratio * buckets.length)));
  }

  function finish() {
    if (!drag) return;
    const lo = Math.min(drag.start, drag.end);
    const hi = Math.max(drag.start, drag.end);
    setDrag(null);
    const first = buckets[lo];
    const last = buckets[hi];
    if (!first || !last) return;
    props.onSelectRange(new Date(first.start), new Date(new Date(last.start).getTime() + bucketMs));
  }

  const hovered = hover === null ? null : buckets[hover];
  const selection = drag
    ? { lo: Math.min(drag.start, drag.end), hi: Math.max(drag.start, drag.end) }
    : null;
  const middle = buckets[Math.floor(buckets.length / 2)];
  const first = buckets[0];
  const last = buckets.at(-1);

  return (
    <div className="relative select-none">
      <svg
        aria-label="Log lines over time. Drag to zoom into a range."
        className="block h-14 w-full cursor-crosshair"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const index = indexAt(event.clientX);
          setDrag({ start: index, end: index });
        }}
        onPointerLeave={() => setHover(null)}
        onPointerMove={(event) => {
          const index = indexAt(event.clientX);
          setHover(index);
          if (drag) setDrag({ ...drag, end: index });
        }}
        onPointerUp={finish}
        preserveAspectRatio="none"
        ref={svgRef}
        role="img"
        viewBox={`0 0 ${buckets.length} ${HEIGHT}`}
      >
        {selection ? (
          <rect
            className="fill-primary/10"
            height={HEIGHT}
            width={selection.hi - selection.lo + 1}
            x={selection.lo}
            y={0}
          />
        ) : null}
        {buckets.map((bucket, index) => {
          let y = HEIGHT;
          return (
            <g key={bucket.start} opacity={hover === null || hover === index ? 1 : 0.55}>
              {LOG_LEVELS.map((level) => {
                const count = bucket[level];
                if (count === 0) return null;
                const height = Math.max(1.5, (count / max) * (HEIGHT - 4));
                y -= height;
                return (
                  <rect
                    className={LEVEL_BAR[level]}
                    height={height}
                    key={level}
                    width={0.7}
                    x={index + 0.15}
                    y={y}
                  />
                );
              })}
            </g>
          );
        })}
        <line
          className="stroke-border"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          x1={0}
          x2={buckets.length}
          y1={HEIGHT - 0.5}
          y2={HEIGHT - 0.5}
        />
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[11px] text-muted-foreground tabular-nums">
        <span>{first ? axisLabel(first.start, bucketMs) : null}</span>
        <span>{middle ? axisLabel(middle.start, bucketMs) : null}</span>
        <span>
          {last
            ? axisLabel(new Date(new Date(last.start).getTime() + bucketMs).toISOString(), bucketMs)
            : null}
        </span>
      </div>
      {hovered && hover !== null ? (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2 py-1.5 text-popover-foreground text-xs shadow-md"
          style={{ left: `${((hover + 0.5) / buckets.length) * 100}%` }}
        >
          <div className="mb-1 font-mono text-muted-foreground">
            {axisLabel(hovered.start, Math.min(bucketMs, 60_000))} UTC
          </div>
          {[...LOG_LEVELS].reverse().map((level) => (
            <div className="flex items-center gap-2" key={level}>
              <span className={`size-2 rounded-full ${LEVEL_DOT[level]}`} />
              <span className="flex-1">{LEVEL_LABEL[level]}</span>
              <span className="font-mono tabular-nums">{compactCount(hovered[level])}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
