"use client";

import { motion } from "motion/react";
import { useScene } from "./scene";

// A deterministic diff: [sign, indent, width in %]. Repeated twice so the scroll can loop.
const LINES: ["+" | "-" | " ", number, number][] = Array.from({ length: 22 }, (_, i) => {
  const sign = i % 7 === 3 || i % 11 === 5 ? "-" : i % 3 === 0 ? " " : "+";
  return [sign, (i * 5) % 4, 28 + ((i * 37) % 55)];
});

/** 2 · An endless diff scrolling past, fading out at both ends: nobody reads it. */
export function UnreadDiff() {
  const { ref, play, reduced } = useScene();
  const moving = play && !reduced;

  return (
    <div aria-hidden className="relative overflow-hidden rounded-lg border bg-background" ref={ref}>
      <div className="flex items-center justify-between border-b px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
        <span>+48,213 −12,907</span>
        <span>0 lines read</span>
      </div>
      <div className="relative h-40 overflow-hidden [mask-image:linear-gradient(transparent,black_30%,black_55%,transparent)]">
        <motion.div
          animate={moving ? { y: ["0%", "-50%"] } : { y: "0%" }}
          transition={
            moving ? { duration: 14, ease: "linear", repeat: Number.POSITIVE_INFINITY } : undefined
          }
        >
          {[0, 1].map((copy) => (
            <div key={copy}>
              {LINES.map(([sign, indent, width], index) => (
                <div
                  className={
                    sign === "+"
                      ? "flex h-5 items-center gap-2 bg-foreground/[0.04] px-3"
                      : "flex h-5 items-center gap-2 px-3"
                  }
                  // biome-ignore lint/suspicious/noArrayIndexKey: a fixed, generated list
                  key={index}
                >
                  <span className="w-6 text-right font-mono text-[10px] text-muted-foreground/60">
                    {copy * LINES.length + index + 1}
                  </span>
                  <span className="w-2 font-mono text-[11px] text-muted-foreground">{sign}</span>
                  <span
                    className={
                      sign === "-"
                        ? "h-1.5 rounded-full border border-foreground/25 border-dashed"
                        : sign === "+"
                          ? "h-1.5 rounded-full bg-foreground/30"
                          : "h-1.5 rounded-full bg-foreground/12"
                    }
                    style={{ marginLeft: `${indent * 0.75}rem`, width: `${width}%` }}
                  />
                </div>
              ))}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
