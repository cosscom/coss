"use client";

import { motion } from "motion/react";
import { ease, Status, useScene, useSequence } from "./scene";

const TESTS = [
  ["e2e", "sign up and verify email", "1.2s"],
  ["e2e", "book a slot across time zones", "2.8s"],
  ["qa agent", "explores settings, light and dark", "14s"],
  ["qa agent", "screenshot diff, 3 viewports", "6.1s"],
  ["e2e", "cancel and refund", "1.9s"],
];

/** 5 · Guardrails at work: end-to-end tests and an AI QA agent run and pass. */
export function Guardrails() {
  const { ref, play, reduced } = useScene();
  const step = useSequence(play, reduced, { steps: TESTS.length + 5, ms: 700 });
  const passed = Math.min(Math.max(step - 1, 0), TESTS.length);

  return (
    <div aria-hidden className="overflow-hidden rounded-lg border bg-background" ref={ref}>
      <div className="flex items-center justify-between border-b px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
        <span>guardrails · run #9312</span>
        <span>
          <span className="text-foreground">{passed}</span> / {TESTS.length} passed · 0 failed
        </span>
      </div>
      <div className="h-px bg-border">
        <motion.div
          animate={{ scaleX: passed / TESTS.length }}
          className="h-px origin-left bg-foreground"
          initial={{ scaleX: 0 }}
          transition={ease(reduced, { duration: 0.5 })}
        />
      </div>
      <ul className="flex flex-col py-1">
        {TESTS.map(([kind, name, time], index) => {
          const state =
            index < passed ? "passed" : index === passed && step > 0 ? "running" : "idle";
          return (
            <li className="flex items-center gap-2.5 px-3 py-1" key={name}>
              <Status reduced={reduced} state={state} />
              <span className="w-14 shrink-0 font-mono text-[11px] text-muted-foreground">
                {kind}
              </span>
              <span className="truncate text-xs">{name}</span>
              <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                {state === "passed" ? time : state === "running" ? "…" : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
