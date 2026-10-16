"use client";

import { AnimatePresence, motion } from "motion/react";
import { ease, Status, useScene, useSequence } from "./scene";

const CHECKS = ["types", "unit tests", "end-to-end", "security scan", "review agent"];

/** 3 · A pull request whose checks tick themselves off, then approve and merge it. */
export function AutoReview() {
  const { ref, play, reduced } = useScene();
  // One step per check, then "approved", then a hold before it starts over.
  const step = useSequence(play, reduced, { steps: CHECKS.length + 4, ms: 650 });
  const done = step > CHECKS.length;

  return (
    <div aria-hidden className="overflow-hidden rounded-lg border bg-background" ref={ref}>
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
        <span className="truncate text-sm">
          <span className="font-mono text-muted-foreground text-xs">#1284 </span>Add date presets
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            animate={{ opacity: 1, scale: 1 }}
            className={
              done
                ? "shrink-0 rounded-full bg-foreground px-2 py-0.5 font-mono text-[10px] text-background"
                : "shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
            }
            exit={{ opacity: 0, scale: 0.9 }}
            initial={{ opacity: 0, scale: 0.9 }}
            key={done ? "merged" : "open"}
            transition={ease(reduced, { duration: 0.3 })}
          >
            {done ? "approved · merged" : "open"}
          </motion.span>
        </AnimatePresence>
      </div>
      <ul className="flex flex-col py-1">
        {CHECKS.map((check, index) => (
          <li className="flex items-center gap-2.5 px-3 py-1" key={check}>
            <Status
              reduced={reduced}
              state={step > index + 1 ? "passed" : step === index + 1 ? "running" : "idle"}
            />
            <span className="font-mono text-xs">{check}</span>
            <span className="leader" />
            <span className="font-mono text-[11px] text-muted-foreground">
              {step > index + 1 ? "passed" : step === index + 1 ? "running" : "queued"}
            </span>
          </li>
        ))}
      </ul>
      <div className="border-t px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
        reviewed by: an agent · read by: nobody
      </div>
    </div>
  );
}
