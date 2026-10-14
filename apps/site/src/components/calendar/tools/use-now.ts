"use client";

import { useMemo, useSyncExternalStore } from "react";

function createClock(tickMs?: number) {
  let ms: number | null = null;
  return {
    get: () => (ms ??= Date.now()),
    subscribe(notify: () => void) {
      if (!tickMs) return () => {};
      const read = () => {
        if (document.hidden) return;
        ms = Date.now();
        notify();
      };
      const id = setInterval(read, tickMs);
      document.addEventListener("visibilitychange", read);
      return () => {
        clearInterval(id);
        document.removeEventListener("visibilitychange", read);
      };
    },
  };
}

const noClock = () => null;

/**
 * The current time, `null` on the server and during hydration: the prerender does not know what
 * time it is where the reader is.
 *
 * @param tickMs - re-read the clock on an interval while the tab is visible.
 */
export function useNow(tickMs?: number): Date | null {
  const clock = useMemo(() => createClock(tickMs), [tickMs]);
  const ms = useSyncExternalStore(clock.subscribe, clock.get, noClock);
  return useMemo(() => (ms === null ? null : new Date(ms)), [ms]);
}
