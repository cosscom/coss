"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect } from "react";
import { ease, useScene } from "./scene";

const CODE: [number, number][] = Array.from({ length: 9 }, (_, i) => [
  (i * 3) % 3,
  30 + ((i * 41) % 50),
]);
// Lines the scanner flags, and when (as a fraction of one sweep).
const FINDINGS = [
  { line: 2, label: "CVE · injection" },
  { line: 5, label: "leaked token" },
  { line: 7, label: "CVE · RCE" },
];
const SWEEP = 4.5;

/** 6a · Public code under a scanner that never stops: every line is an attack surface. */
export function Exposure() {
  const { ref, play, reduced } = useScene();
  const moving = play && !reduced;

  return (
    <div aria-hidden className="overflow-hidden rounded-lg border bg-background" ref={ref}>
      <div className="flex items-center justify-between border-b px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
        <span>public · readable by everyone</span>
        <span>{FINDINGS.length} findings</span>
      </div>
      <div className="relative py-2">
        {CODE.map(([indent, width], index) => {
          const finding = FINDINGS.find((f) => f.line === index);
          const at = index / CODE.length;
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed, generated list
            <div className="relative flex h-5 items-center gap-2 px-3" key={index}>
              <span
                className="h-1.5 rounded-full bg-foreground/15"
                style={{ marginLeft: `${indent * 0.75}rem`, width: `${width}%` }}
              />
              {finding && (
                <motion.span
                  animate={
                    !play
                      ? { opacity: 0 }
                      : reduced
                        ? { opacity: 1, x: 0 }
                        : { opacity: [0, 1, 1, 0], x: [6, 0, 0, 0] }
                  }
                  className="ml-auto flex shrink-0 items-center gap-1.5 rounded border border-foreground/40 border-dashed px-1.5 font-mono text-[10px]"
                  initial={{ opacity: 0 }}
                  transition={
                    moving
                      ? {
                          duration: SWEEP,
                          times: [at, at + 0.06, 0.92, 1],
                          repeat: Number.POSITIVE_INFINITY,
                        }
                      : { duration: 0 }
                  }
                >
                  <span className="font-semibold">!</span>
                  {finding.label}
                </motion.span>
              )}
            </div>
          );
        })}
        {moving && (
          <motion.div
            animate={{ top: ["0%", "100%"] }}
            className="pointer-events-none absolute inset-x-0 h-6 -translate-y-full bg-gradient-to-b from-transparent to-foreground/10"
            transition={{ duration: SWEEP, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
          >
            <div className="absolute inset-x-0 bottom-0 h-px bg-foreground/50" />
          </motion.div>
        )}
      </div>
    </div>
  );
}

const HOURS = Array.from(
  { length: 24 },
  (_, i) => 18 + ((i * 47) % 70) + (i > 8 && i < 19 ? 12 : 0),
);

/** 6b · Lines pushed per hour against what people can review: the gap only grows. */
export function Volume() {
  const { ref, play, reduced } = useScene();
  const pushed = useMotionValue(0);
  const shown = useTransform(pushed, (value) => Math.round(value).toLocaleString("en-US"));
  useEffect(() => {
    if (!play) return;
    const controls = animate(
      pushed,
      1_204_873,
      reduced ? { duration: 0 } : { duration: 2.4, ease: [0.16, 1, 0.3, 1] },
    );
    return () => controls.stop();
  }, [play, reduced, pushed]);

  return (
    <div aria-hidden className="overflow-hidden rounded-lg border bg-background" ref={ref}>
      <div className="flex items-baseline justify-between gap-3 border-b px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
        <span>
          lines pushed today <motion.span className="text-foreground">{shown}</motion.span>
        </span>
        <span>reviewed 0.3%</span>
      </div>
      <div className="relative flex h-[8.5rem] items-end gap-[3px] px-3 pt-3 pb-2">
        {HOURS.map((height, index) => (
          <motion.span
            animate={{ scaleY: play ? 1 : 0 }}
            className="flex-1 origin-bottom rounded-t-[2px] bg-foreground/25"
            initial={{ scaleY: 0 }}
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed, generated list
            key={index}
            style={{ height: `${height}%` }}
            transition={ease(reduced, { duration: 0.8, delay: index * 0.035 })}
          />
        ))}
        <div className="absolute inset-x-3 bottom-[calc(0.5rem+6%)] border-foreground border-t border-dashed" />
        <span className="absolute right-3 bottom-[calc(0.5rem+6%+4px)] bg-background px-1 font-mono text-[10px]">
          human review capacity
        </span>
      </div>
    </div>
  );
}
