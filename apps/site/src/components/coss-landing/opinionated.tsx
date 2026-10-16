"use client";

import { motion } from "motion/react";
import { useScene } from "./scene";

const GATE_X = 330;
const MID_Y = 100;
const CYCLE = 6;

// Ideas from the crowd: deterministic start points spread over the left side; every third one
// is declined at the gate, the rest pass and join the line the maintainers keep.
const IDEAS = Array.from({ length: 24 }, (_, i) => ({
  id: `idea-${i}`,
  x: 14 + ((i * 53) % 150),
  y: 18 + ((i * 71) % 164),
  declined: i % 3 === 1,
  delay: (i * CYCLE) / 24,
}));

/** 11 · Ideas from everywhere, funnelled through the maintainers into one opinionated line. */
export function Opinionated() {
  const { ref, play, reduced } = useScene();
  const moving = play && !reduced;

  return (
    <div aria-hidden className="w-full max-w-5xl" ref={ref}>
      <svg aria-hidden className="h-auto w-full text-foreground" viewBox="0 0 640 200">
        <text className="fill-muted-foreground font-mono text-[10px]" x={14} y={12}>
          the crowd
        </text>
        <text className="fill-muted-foreground font-mono text-[10px]" x={GATE_X - 30} y={12}>
          maintainers
        </text>
        <text
          className="fill-muted-foreground font-mono text-[10px]"
          textAnchor="end"
          x={626}
          y={12}
        >
          the product
        </text>
        {/* The funnel and the gate. */}
        <path
          d={`M200 22 L${GATE_X} ${MID_Y - 14} M200 178 L${GATE_X} ${MID_Y + 14}`}
          opacity={0.35}
          stroke="currentColor"
          strokeDasharray="3 4"
        />
        <line stroke="currentColor" x1={GATE_X} x2={GATE_X} y1={24} y2={MID_Y - 14} />
        <line stroke="currentColor" x1={GATE_X} x2={GATE_X} y1={MID_Y + 14} y2={176} />
        {/* The opinionated line it all becomes. */}
        <line stroke="currentColor" strokeWidth={2} x1={GATE_X} x2={600} y1={MID_Y} y2={MID_Y} />
        <rect fill="currentColor" height={16} rx={3} width={26} x={600} y={MID_Y - 8} />
        {/* Where each idea comes from, always faintly there. */}
        {IDEAS.map((idea) => (
          <circle
            cx={idea.x}
            cy={idea.y}
            fill="currentColor"
            key={`${idea.id}-origin`}
            opacity={0.18}
            r={2}
          />
        ))}
        {IDEAS.map((idea) =>
          moving ? (
            <motion.circle
              animate={
                idea.declined
                  ? {
                      cx: [idea.x, GATE_X - 10, GATE_X - 22],
                      cy: [idea.y, MID_Y + (idea.y - MID_Y) * 0.18, idea.y > MID_Y ? 190 : 10],
                      opacity: [0, 0.8, 0],
                    }
                  : {
                      cx: [idea.x, GATE_X, 600],
                      cy: [idea.y, MID_Y, MID_Y],
                      opacity: [0, 1, 1, 0],
                    }
              }
              fill={idea.declined ? "var(--background)" : "currentColor"}
              key={idea.id}
              r={3}
              stroke="currentColor"
              transition={{
                duration: CYCLE,
                delay: idea.delay,
                ease: "easeInOut",
                repeat: Number.POSITIVE_INFINITY,
                times: idea.declined ? [0, 0.55, 1] : undefined,
              }}
            />
          ) : (
            <circle
              cx={idea.x}
              cy={idea.y}
              fill={idea.declined ? "var(--background)" : "currentColor"}
              key={idea.id}
              opacity={0.8}
              r={3}
              stroke="currentColor"
            />
          ),
        )}
      </svg>
    </div>
  );
}
