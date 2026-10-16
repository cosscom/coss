"use client";

import { motion } from "motion/react";
import { ease, useScene, useSequence } from "./scene";

const NODES = {
  web: [40, 70],
  auth: [120, 30],
  queue: [120, 110],
  api: [205, 70],
  db: [282, 34],
  mail: [282, 106],
} as const;
type Node = keyof typeof NODES;
const EDGES: [Node, Node][] = [
  ["web", "auth"],
  ["web", "queue"],
  ["auth", "api"],
  ["queue", "api"],
  ["api", "db"],
  ["api", "mail"],
];

// healthy, healthy, broken, broken, healing, healed, healed, healed (then again)
const PHASES = ["ok", "ok", "broken", "broken", "healing", "healed", "healed", "healed"] as const;
const LABELS = {
  ok: "api · healthy",
  broken: "api · crashed · 502s",
  healing: "api · rolling back to the last good build",
  healed: "api · healed in 14s · nobody paged",
};

/** 4 · A service graph where one node breaks and repairs itself. */
export function SelfHealing() {
  const { ref, play, reduced } = useScene();
  const phase =
    PHASES[useSequence(play, reduced, { steps: PHASES.length, ms: 900, final: 5 })] ?? "ok";
  const down = phase === "broken" || phase === "healing";
  const [ax, ay] = NODES.api;

  return (
    <div aria-hidden className="overflow-hidden rounded-lg border bg-background" ref={ref}>
      <svg aria-hidden className="h-40 w-full text-foreground" viewBox="0 0 320 140">
        {EDGES.map(([from, to]) => {
          const [x1, y1] = NODES[from];
          const [x2, y2] = NODES[to];
          const touched = from === "api" || to === "api";
          return (
            <line
              key={`${from}-${to}`}
              opacity={touched && down ? 0.35 : 0.5}
              stroke="currentColor"
              strokeDasharray={touched && down ? "3 3" : undefined}
              vectorEffect="non-scaling-stroke"
              x1={x1}
              x2={x2}
              y1={y1}
              y2={y2}
            />
          );
        })}
        {(Object.keys(NODES) as Node[])
          .filter((node) => node !== "api")
          .map((node) => {
            const [x, y] = NODES[node];
            return (
              <g key={node}>
                <circle cx={x} cy={y} fill="var(--background)" r={9} stroke="currentColor" />
                <circle cx={x} cy={y} fill="currentColor" r={3} />
              </g>
            );
          })}
        {phase === "healing" && (
          <motion.circle
            animate={{ r: [12, 26], opacity: [0.6, 0] }}
            cx={ax}
            cy={ay}
            fill="none"
            stroke="currentColor"
            transition={{ duration: 0.9, ease: "easeOut", repeat: Number.POSITIVE_INFINITY }}
          />
        )}
        <motion.circle
          animate={{ scale: phase === "healed" ? [1.25, 1] : 1 }}
          cx={ax}
          cy={ay}
          fill={phase === "healed" ? "currentColor" : "var(--background)"}
          r={12}
          stroke="currentColor"
          strokeDasharray={down ? "3 2.5" : undefined}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          transition={ease(reduced, { duration: 0.5 })}
        />
        {down && (
          <path
            d={`M${ax - 4} ${ay - 4}l8 8M${ax + 4} ${ay - 4}l-8 8`}
            stroke="currentColor"
            strokeLinecap="round"
          />
        )}
        {phase === "ok" && <circle cx={ax} cy={ay} fill="currentColor" r={3.5} />}
        {phase === "healed" && (
          <motion.path
            animate={{ pathLength: 1 }}
            d={`M${ax - 4.5} ${ay + 0.5}l3 3 6-6.5`}
            fill="none"
            initial={{ pathLength: reduced ? 1 : 0 }}
            stroke="var(--background)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            transition={ease(reduced, { duration: 0.4, delay: 0.15 })}
          />
        )}
      </svg>
      <div className="border-t px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
        {LABELS[phase]}
      </div>
    </div>
  );
}
