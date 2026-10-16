"use client";

import { GlobeIcon, LockIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ease, Status, useScene, useSequence } from "./scene";

const REPOS = [
  { name: "acme/bookings", visibility: "private" },
  { name: "oss/kloq", visibility: "public" },
  { name: "you/side-project", visibility: "private" },
  { name: "team/design-system", visibility: "public" },
  { name: "acme/internal-tools", visibility: "private" },
] as const;

/** 12 · Repositories, private and public, launching on coss.com one after another. */
export function LaunchRepos() {
  const { ref, play, reduced } = useScene();
  const step = useSequence(play, reduced, { steps: REPOS.length * 2 + 4, ms: 550 });

  return (
    <div aria-hidden className="w-full max-w-md" ref={ref}>
      <div className="overflow-hidden rounded-xl border bg-background">
        <div className="flex items-center justify-between border-b px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
          <span>launch on coss.com</span>
          <span>
            <span className="text-foreground">{Math.min(Math.floor(step / 2), REPOS.length)}</span>{" "}
            / {REPOS.length} live
          </span>
        </div>
        <ul>
          {REPOS.map((repo, index) => {
            const state =
              step > index * 2 + 1 ? "live" : step === index * 2 + 1 ? "launching" : "ready";
            const Icon = repo.visibility === "private" ? LockIcon : GlobeIcon;
            return (
              <li
                className="flex items-center gap-3 border-b px-4 py-2.5 last:border-b-0"
                key={repo.name}
              >
                <Icon className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                <span className="truncate font-mono text-xs">{repo.name}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {repo.visibility}
                </span>
                <span className="ml-auto flex h-6 items-center">
                  <AnimatePresence initial={false} mode="wait">
                    <motion.span
                      animate={{ opacity: 1, y: 0 }}
                      className={
                        state === "live"
                          ? "flex items-center gap-1.5 font-mono text-[11px]"
                          : "flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] text-muted-foreground"
                      }
                      exit={{ opacity: 0, y: -6 }}
                      initial={{ opacity: 0, y: 6 }}
                      key={state}
                      transition={ease(reduced, { duration: 0.3 })}
                    >
                      {state === "live" && <Status reduced={reduced} state="passed" />}
                      {state === "launching" && <Status reduced={reduced} state="running" />}
                      {state === "live" ? "live" : state === "launching" ? "launching" : "Launch"}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
