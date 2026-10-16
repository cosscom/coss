"use client";

import { BellIcon, FactoryIcon } from "lucide-react";
import { motion } from "motion/react";
import { ease, Status, useScene, useSequence } from "./scene";

const frame = "relative h-44 overflow-hidden rounded-lg border bg-background";

/** Step 1 · "pull request" is struck through and becomes a "prompt request". */
export function PromptSwap() {
  const { ref, play, reduced } = useScene();
  return (
    <div aria-hidden className={`${frame} flex flex-col justify-center gap-3 px-4`} ref={ref}>
      <div className="relative w-fit font-mono text-muted-foreground text-sm">
        pull request · +412 −96
        <motion.span
          animate={{ scaleX: play ? 1 : 0 }}
          className="absolute inset-x-0 top-1/2 h-px origin-left bg-foreground"
          initial={{ scaleX: 0 }}
          transition={ease(reduced, { duration: 0.7, delay: 0.3 })}
        />
      </div>
      <motion.div
        animate={play ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        className="flex flex-col gap-1.5 rounded-md border px-3 py-2.5"
        initial={{ opacity: 0, y: 8 }}
        transition={ease(reduced, { delay: 0.9 })}
      >
        <span className="font-mono text-[11px] text-muted-foreground">
          prompt request · English
        </span>
        <span className="text-sm leading-snug">“Let guests pick a time zone.”</span>
      </motion.div>
    </div>
  );
}

const DECISIONS = [
  { title: "Dark mode for invoices", verdict: "approved", comment: "Yes, match the dashboard." },
  {
    title: "Rewrite it in another language",
    verdict: "declined",
    comment: "Not our direction, sorry.",
  },
] as const;

/** Step 2 (8) · The maintainers approve one request and decline another, each with a comment. */
export function Decisions() {
  const { ref, play, reduced } = useScene();
  const step = useSequence(play, reduced, { steps: 7, ms: 800, final: 4 });
  return (
    <div aria-hidden className={`${frame} flex flex-col justify-center gap-2 px-3`} ref={ref}>
      {DECISIONS.map((decision, index) => {
        const decided = step > index * 2;
        const commented = step > index * 2 + 1;
        const approved = decision.verdict === "approved";
        return (
          <div className="flex flex-col gap-1 rounded-md border px-2.5 py-2" key={decision.title}>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs">{decision.title}</span>
              <motion.span
                animate={
                  decided
                    ? { opacity: 1, scale: 1, rotate: -4 }
                    : { opacity: 0, scale: 1.6, rotate: -4 }
                }
                className={
                  approved
                    ? "shrink-0 rounded border border-foreground px-1.5 font-mono text-[10px] uppercase"
                    : "shrink-0 rounded border border-foreground/40 border-dashed px-1.5 font-mono text-[10px] text-muted-foreground uppercase"
                }
                initial={{ opacity: 0, scale: 1.6, rotate: -4 }}
                transition={ease(reduced, { duration: 0.35 })}
              >
                {decision.verdict}
              </motion.span>
            </div>
            <motion.span
              animate={commented ? { opacity: 1, height: "auto" } : { opacity: 0, height: 0 }}
              className="overflow-hidden font-mono text-[11px] text-muted-foreground"
              initial={{ opacity: 0, height: 0 }}
              transition={ease(reduced, { duration: 0.4 })}
            >
              maintainer: {decision.comment}
            </motion.span>
          </div>
        );
      })}
    </div>
  );
}

const STAGES = ["write", "test", "ship"];

/** Step 3 (9) · The software factory: the approved prompt travels through write, test, ship. */
export function Factory() {
  const { ref, play, reduced } = useScene();
  const step = useSequence(play, reduced, {
    steps: STAGES.length + 3,
    ms: 900,
    final: STAGES.length + 1,
  });
  return (
    <div aria-hidden className={`${frame} flex flex-col justify-center gap-4 px-4`} ref={ref}>
      <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
        <motion.span
          animate={play && !reduced ? { rotate: [0, -8, 8, 0] } : { rotate: 0 }}
          className="flex"
          transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, repeatDelay: 0.6 }}
        >
          <FactoryIcon className="size-4 text-foreground" strokeWidth={1.5} />
        </motion.span>
        Shipyard · building #482
      </div>
      <div className="relative flex items-center justify-between">
        <div className="absolute inset-x-2 top-1/2 h-px bg-border" />
        <motion.div
          animate={{ scaleX: Math.min(step, STAGES.length) / STAGES.length }}
          className="absolute inset-x-2 top-1/2 h-px origin-left bg-foreground"
          initial={{ scaleX: 0 }}
          transition={ease(reduced, { duration: 0.8 })}
        />
        {["prompt", ...STAGES].map((stage, index) => (
          <div
            className="relative flex flex-col items-center gap-1.5 bg-background px-1"
            key={stage}
          >
            <Status
              reduced={reduced}
              state={
                index === 0 || step >= index ? "passed" : step === index - 1 ? "running" : "idle"
              }
            />
            <span className="font-mono text-[10px] text-muted-foreground">{stage}</span>
          </div>
        ))}
      </div>
      <span className="font-mono text-[11px] text-muted-foreground">
        {step > STAGES.length ? "shipped · author notified" : "no human wrote this code"}
      </span>
    </div>
  );
}

/** Step 4 (9) · A public preview URL with screenshots, and the author's notification. */
export function Preview() {
  const { ref, play, reduced } = useScene();
  const url = "preview-482.example.coss.app";
  const step = useSequence(play, reduced, { steps: 4, ms: 700, loop: false });
  return (
    <div aria-hidden className={`${frame} flex flex-col`} ref={ref}>
      <div className="flex items-center gap-2 border-b px-3 py-1.5">
        <span className="size-1.5 rounded-full bg-foreground" />
        <motion.span
          animate={{ clipPath: play ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)" }}
          className="truncate font-mono text-[11px]"
          initial={{ clipPath: "inset(0 100% 0 0)" }}
          transition={ease(reduced, { duration: 1, ease: "linear" })}
        >
          {url}
        </motion.span>
      </div>
      <div className="flex flex-1 gap-2 p-3">
        {["light", "dark"].map((theme, index) => (
          <motion.div
            animate={step > index ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            className={
              theme === "dark"
                ? "flex flex-1 flex-col gap-1 rounded border bg-foreground p-2"
                : "flex flex-1 flex-col gap-1 rounded border bg-background p-2"
            }
            initial={{ opacity: 0, y: 10 }}
            key={theme}
            transition={ease(reduced, { duration: 0.5 })}
          >
            {[70, 45, 85, 55].map((width) => (
              <span
                className={
                  theme === "dark"
                    ? "h-1 rounded-full bg-background/30"
                    : "h-1 rounded-full bg-foreground/15"
                }
                key={width}
                style={{ width: `${width}%` }}
              />
            ))}
            <span
              className={
                theme === "dark"
                  ? "mt-auto font-mono text-[9px] text-background/60"
                  : "mt-auto font-mono text-[9px] text-muted-foreground"
              }
            >
              {theme}.png
            </span>
          </motion.div>
        ))}
      </div>
      <motion.div
        animate={step > 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: -12 }}
        className="absolute top-8 right-2 flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 font-mono text-[10px] shadow-sm"
        initial={{ opacity: 0, y: -12 }}
        transition={ease(reduced, { duration: 0.45 })}
      >
        <BellIcon className="size-3" strokeWidth={1.5} />
        your prompt is live
      </motion.div>
    </div>
  );
}
