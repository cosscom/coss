"use client";

import { motion, type TargetAndTransition, type Transition } from "motion/react";
import type { ReactNode } from "react";
import { useScene } from "./scene";

const AUTO = ["copy fix", "deps bump", "a11y label", "translation"];
const GATED = ["new feature", "billing change", "auth flow"];
const AUTO_SECONDS = 6;
const GATED_SECONDS = 7.5;
const GATE = "62%";
// Where a gated chip waits: its right edge just short of the gate.
const STOP = "47%";

/**
 * 10 · Two lanes: auto-allowed changes run straight through to the factory; the others stop at
 * the maintainer's gate until it is approved.
 */
export function MaintainerRules() {
  const { ref, play, reduced } = useScene();
  const moving = play && !reduced;

  return (
    <div
      aria-hidden
      className="w-full max-w-5xl overflow-hidden rounded-xl border bg-background"
      ref={ref}
    >
      <Lane label="auto-allow" end="factory">
        {AUTO.map((change, index) => (
          <Chip
            animate={moving ? { left: ["-12%", "100%"], opacity: [0, 1, 1, 0] } : undefined}
            key={change}
            label={change}
            restLeft={`${8 + index * 22}%`}
            transition={{
              duration: AUTO_SECONDS,
              ease: "linear",
              delay: (index * AUTO_SECONDS) / AUTO.length,
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
        ))}
      </Lane>
      <Lane gate label="require approval" end="factory">
        {GATED.map((change, index) => (
          <Chip
            animate={
              moving
                ? {
                    left: ["-12%", STOP, STOP, "100%"],
                    opacity: [0, 1, 1, 0],
                  }
                : undefined
            }
            gated
            key={change}
            label={change}
            restLeft={`${4 + index * 18}%`}
            transition={{
              duration: GATED_SECONDS,
              ease: "easeInOut",
              delay: (index * GATED_SECONDS) / GATED.length,
              repeat: Number.POSITIVE_INFINITY,
              times: [0, 0.35, 0.65, 1],
            }}
          />
        ))}
        {moving && (
          <motion.span
            animate={{ opacity: [0, 0, 1, 1, 0] }}
            className="absolute top-1 font-mono text-[10px]"
            style={{ left: `calc(${GATE} + 0.5rem)` }}
            transition={{
              duration: GATED_SECONDS / GATED.length,
              repeat: Number.POSITIVE_INFINITY,
              // In step with each chip's wait at the gate (the last part of it).
              times: [0, 0.58, 0.62, 0.94, 1],
            }}
          >
            maintainer ✓
          </motion.span>
        )}
      </Lane>
    </div>
  );
}

function Lane({
  label,
  end,
  gate = false,
  children,
}: {
  label: string;
  end: string;
  gate?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex items-stretch border-b last:border-b-0">
      <div className="flex w-32 shrink-0 items-center border-r px-3 font-mono text-[11px] text-muted-foreground sm:w-40 sm:px-4">
        {label}
      </div>
      <div className="relative h-16 flex-1 overflow-hidden">
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed" />
        {gate && (
          <div className="absolute inset-y-2 w-px bg-foreground" style={{ left: GATE }}>
            <span className="absolute -top-0.5 left-1.5 font-mono text-[10px] text-muted-foreground">
              gate
            </span>
          </div>
        )}
        {children}
      </div>
      <div className="flex w-20 shrink-0 items-center justify-center border-l font-mono text-[11px] sm:w-24">
        {end}
      </div>
    </div>
  );
}

function Chip({
  label,
  gated = false,
  restLeft,
  animate,
  transition,
}: {
  label: string;
  gated?: boolean;
  restLeft: string;
  animate?: TargetAndTransition;
  transition: Transition;
}) {
  return (
    <motion.span
      animate={animate}
      className={
        gated
          ? "absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-dashed bg-background px-2.5 py-0.5 font-mono text-[11px]"
          : "absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border bg-background px-2.5 py-0.5 font-mono text-[11px]"
      }
      style={{ left: animate ? "-12%" : restLeft, opacity: animate ? 0 : 1 }}
      transition={transition}
    >
      {label}
    </motion.span>
  );
}
