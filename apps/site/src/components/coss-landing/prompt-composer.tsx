"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { ease, useScene, Window } from "./scene";

const PROMPTS = [
  "Let me filter the bookings list by date. Presets like ‘this week’ and ‘last 30 days’ would cover almost everything I do.",
  "Invoices are hard to read at night. Could they follow the dark mode the rest of the app already has?",
  "When a booking is cancelled, tell the guest why, in the same email that cancels it.",
];
const TYPE_MS = 24;
const HOLD_MS = 2800;

/** 7 · A Prompt Request typed in plain English and opened, one after another. */
export function PromptComposer() {
  const { ref, play, reduced } = useScene();
  const [prompt, setPrompt] = useState(0);
  const [typed, setTyped] = useState(0);
  const text = PROMPTS[prompt] ?? "";
  const complete = typed >= text.length;

  useEffect(() => {
    if (!play) return;
    if (reduced) {
      setTyped(text.length);
      return;
    }
    const id = complete
      ? setTimeout(() => {
          setTyped(0);
          setPrompt((current) => (current + 1) % PROMPTS.length);
        }, HOLD_MS)
      : setTimeout(() => setTyped((current) => current + 1), TYPE_MS);
    return () => clearTimeout(id);
  }, [play, reduced, complete, text.length]);

  return (
    <div aria-hidden className="w-full max-w-3xl" ref={ref}>
      <Window title="new prompt request · acme/bookings">
        <div className="flex flex-col gap-3 px-5 py-5">
          <div className="flex items-center gap-2 font-mono text-muted-foreground text-xs">
            <span>English</span>
            <span className="text-border">·</span>
            <span>0 lines of code</span>
          </div>
          <p className="min-h-[4.5rem] text-lg leading-snug sm:min-h-[3rem]">
            “{text.slice(0, typed)}
            {!complete && (
              <motion.span
                animate={{ opacity: [1, 1, 0, 0] }}
                className="ml-px inline-block h-[1.1em] w-px translate-y-[0.15em] bg-foreground"
                transition={{
                  duration: 0.9,
                  repeat: Number.POSITIVE_INFINITY,
                  times: [0, 0.5, 0.5, 1],
                }}
              />
            )}
            {complete && "”"}
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 border-t px-5 py-3">
          <AnimatePresence mode="wait">
            <motion.span
              animate={{ opacity: 1, y: 0 }}
              className="font-mono text-muted-foreground text-xs"
              exit={{ opacity: 0, y: -4 }}
              initial={{ opacity: 0, y: 4 }}
              key={complete ? `opened-${prompt}` : "draft"}
              transition={ease(reduced, { duration: 0.3 })}
            >
              {complete ? `#${483 + prompt} opened · waiting for the maintainers` : "draft"}
            </motion.span>
          </AnimatePresence>
          <motion.span
            animate={complete ? { scale: [1, 0.94, 1] } : { scale: 1 }}
            className={
              complete
                ? "shrink-0 rounded-md bg-foreground px-3 py-1.5 text-background text-sm"
                : "shrink-0 rounded-md border px-3 py-1.5 text-muted-foreground text-sm"
            }
            transition={ease(reduced, { duration: 0.35 })}
          >
            Open prompt request
          </motion.span>
        </div>
      </Window>
    </div>
  );
}
