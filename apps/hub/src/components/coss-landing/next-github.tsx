"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { ease, useScene, Window } from "./scene";

const BEFORE = {
  tabs: ["Code", "Issues", "Pull requests", "Actions"],
  rows: [
    ["src/", "refactor booking store"],
    ["tests/", "fix flaky date test"],
    ["package.json", "bump deps"],
    ["README.md", "update badges"],
  ],
};

const AFTER = {
  tabs: ["Prompts", "Decisions", "Previews"],
  rows: [
    ["Filter bookings by date", "approved"],
    ["Dark mode for invoices", "building"],
    ["Export bookings to CSV", "preview ready"],
    ["Rewrite it in another language", "declined"],
  ],
};

/** 1 · A repository page that starts out as a code host and turns into a list of prompts. */
export function NextGithub() {
  const { ref, play, reduced } = useScene();
  const [next, setNext] = useState(false);
  useEffect(() => {
    if (!play) return;
    const id = setTimeout(() => setNext(true), reduced ? 0 : 1400);
    return () => clearTimeout(id);
  }, [play, reduced]);
  const view = next ? AFTER : BEFORE;

  return (
    <div aria-hidden className="w-full max-w-xl" ref={ref}>
      <Window title="acme/bookings">
        <div className="relative flex h-9 items-end gap-4 overflow-hidden border-b px-4">
          <AnimatePresence initial={false} mode="popLayout">
            {view.tabs.map((tab, index) => (
              <motion.span
                animate={{ opacity: 1, y: 0 }}
                className={
                  index === 0
                    ? "border-foreground border-b pb-2 text-sm"
                    : "pb-2 text-muted-foreground text-sm"
                }
                exit={{ opacity: 0, y: -10 }}
                initial={{ opacity: 0, y: 10 }}
                key={tab}
                transition={ease(reduced, { delay: index * 0.06 })}
              >
                {tab}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
        <ul className="relative h-[11.5rem] overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout">
            {view.rows.map(([name, note], index) => (
              <motion.li
                animate={{ opacity: 1, filter: "blur(0px)", x: 0 }}
                className="flex h-[2.875rem] items-center justify-between gap-4 border-b px-4 last:border-b-0"
                exit={{ opacity: 0, filter: "blur(4px)", x: -16 }}
                initial={{ opacity: 0, filter: "blur(4px)", x: 16 }}
                key={name}
                transition={ease(reduced, { delay: 0.15 + index * 0.08 })}
              >
                <span className={next ? "truncate text-sm" : "truncate font-mono text-sm"}>
                  {name}
                </span>
                <span className="shrink-0 font-mono text-muted-foreground text-xs">{note}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </Window>
      <div className="mt-3 flex items-center gap-2 font-mono text-muted-foreground text-xs">
        <motion.span
          animate={{ width: next ? 24 : 0 }}
          className="h-px bg-foreground"
          initial={{ width: 0 }}
          transition={ease(reduced, { duration: 0.8, delay: 0.4 })}
        />
        <span>
          {next ? "a repository, the way the crowd sees it" : "a repository, as we know it"}
        </span>
      </div>
    </div>
  );
}
