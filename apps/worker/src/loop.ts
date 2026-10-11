import { withIsolationScope } from "@sentry/bun";

/** A job run repeatedly with a pause between runs, until stopped. */
export type Loop = {
  readonly name: string;
  /** Stops scheduling new runs and resolves once the current run (if any) has finished. */
  stop(): Promise<void>;
};

/**
 * Runs `run` immediately, then again `intervalMs` after each run finishes (runs never overlap).
 * A run that finds a full batch of work (`run` returns true) is followed immediately by the next.
 * Errors are logged (and reported to Sentry, tagged with the loop) and the loop carries on.
 */
export function startLoop(options: {
  name: string;
  intervalMs: number;
  run: () => Promise<unknown>;
}): Loop {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let current: Promise<void> = Promise.resolve();

  const tick = () => {
    current = (async () => {
      let busy = false;
      // Each run gets its own scope: whatever it reports (here or in the packages' own
      // console.error calls) is tagged with the loop, and nothing leaks into the next run.
      await withIsolationScope(async (scope) => {
        scope.setTag("loop", options.name);
        try {
          busy = (await options.run()) === true;
        } catch (error) {
          console.error(`[worker:${options.name}] run failed:`, error);
        }
      });
      if (!stopped) timer = setTimeout(tick, busy ? 0 : options.intervalMs);
    })();
  };
  tick();

  return {
    name: options.name,
    async stop() {
      stopped = true;
      clearTimeout(timer);
      await current;
    },
  };
}
