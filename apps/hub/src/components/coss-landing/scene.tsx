"use client";

import { cn } from "@coss/ui/lib/utils";
import { motion, type Transition, useInView, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";

/*
 * Shared pieces of the crowd-opinionated-source-software page's illustrations: each one is a
 * decorative client island that starts once it scrolls into view and loops gently. With
 * `prefers-reduced-motion` they jump to their final frame and stay there. The first render never
 * depends on the motion preference (the server can't know it), so hydration always matches.
 */

/** The landing page's exponential ease-out. */
export const EASE = [0.16, 1, 0.3, 1] as const;

export function useScene<T extends Element = HTMLDivElement>(amount = 0.4) {
  const ref = useRef<T>(null);
  const play = useInView(ref, { once: true, amount });
  // Read after mount, so the first client render matches the server's.
  const prefersReduced = useReducedMotion() ?? false;
  const [reduced, setReduced] = useState(false);
  useEffect(() => setReduced(prefersReduced), [prefersReduced]);
  return { ref, play, reduced };
}

/** A transition, or an instant one under reduced motion. */
export function ease(reduced: boolean, transition: Transition = {}): Transition {
  return reduced ? { duration: 0 } : { duration: 0.6, ease: EASE, ...transition };
}

/**
 * A step counter for sequenced scenes: advances every `ms` once `active`, wrapping to 0 when
 * `loop`, otherwise stopping at the last step. Reduced motion shows `final` (default: the last).
 */
export function useSequence(
  active: boolean,
  reduced: boolean,
  {
    steps,
    ms,
    loop = true,
    final = steps - 1,
  }: { steps: number; ms: number; loop?: boolean; final?: number },
): number {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (reduced) {
      setStep(final);
      return;
    }
    const id = setInterval(() => {
      setStep((current) => (current + 1 < steps ? current + 1 : loop ? 0 : current));
    }, ms);
    return () => clearInterval(id);
  }, [active, reduced, steps, ms, loop, final]);
  return step;
}

/** A small window, drawn like the page's Prompt Request card. */
export function Window({
  title,
  className,
  children,
}: {
  title: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-background", className)}>
      <div className="flex items-center gap-1.5 border-b px-3 py-2">
        <span className="size-2 rounded-full border" />
        <span className="size-2 rounded-full border" />
        <span className="size-2 rounded-full border" />
        <span className="ml-1.5 truncate font-mono text-[11px] text-muted-foreground">{title}</span>
      </div>
      {children}
    </div>
  );
}

/** Running, passed or failed, in grayscale: a spinning arc, a filled check, a dashed cross. */
export function Status({
  state,
  reduced,
  className,
}: {
  state: "idle" | "running" | "passed" | "failed";
  reduced: boolean;
  className?: string;
}) {
  return (
    <span className={cn("relative flex size-3.5 shrink-0 items-center justify-center", className)}>
      {state === "idle" && <span className="size-3 rounded-full border border-dashed" />}
      {state === "running" && (
        <motion.span
          animate={reduced ? undefined : { rotate: 360 }}
          className="size-3 rounded-full border-[1.5px] border-current border-t-transparent text-muted-foreground"
          transition={{ duration: 0.9, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
        />
      )}
      {state === "passed" && (
        <motion.svg
          aria-hidden
          animate={{ scale: 1, opacity: 1 }}
          className="size-3.5 rounded-full bg-foreground text-background"
          initial={{ scale: reduced ? 1 : 0.4, opacity: reduced ? 1 : 0 }}
          transition={ease(reduced, { duration: 0.35 })}
          viewBox="0 0 14 14"
        >
          <motion.path
            animate={{ pathLength: 1 }}
            d="M4 7.2 6.1 9.2 10 5"
            fill="none"
            initial={{ pathLength: reduced ? 1 : 0 }}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.6}
            transition={ease(reduced, { duration: 0.4, delay: 0.1 })}
          />
        </motion.svg>
      )}
      {state === "failed" && (
        <svg aria-hidden className="size-3.5" viewBox="0 0 14 14">
          <circle cx="7" cy="7" fill="none" r="6" stroke="currentColor" strokeDasharray="2 2" />
          <path d="M5 5l4 4M9 5l-4 4" stroke="currentColor" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}
