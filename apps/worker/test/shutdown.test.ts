import { expect, test } from "bun:test";
import { startLoop } from "../src/loop.ts";
import { createShutdown } from "../src/shutdown.ts";

test("shutdown aborts, waits for every current run, then closes the pool once", async () => {
  const controller = new AbortController();
  const events: string[] = [];
  let release!: () => void;
  const inFlight = new Promise<void>((resolve) => {
    release = resolve;
  });
  const loops = [
    // A run in progress (a webhook attempt): it must finish before the pool closes.
    startLoop({
      name: "slow",
      intervalMs: 60_000,
      run: async () => {
        await inFlight;
        events.push("slow run finished");
      },
    }),
    // A long poll that ends when the signal aborts (like the SQS receive).
    startLoop({
      name: "poll",
      intervalMs: 0,
      run: async () => {
        if (controller.signal.aborted) return;
        await new Promise((resolve) => controller.signal.addEventListener("abort", resolve));
        events.push("poll aborted");
      },
    }),
  ];
  const shutdown = createShutdown({
    controller,
    loops,
    close: async () => {
      events.push("closed");
    },
  });

  const stopped = shutdown();
  expect(shutdown()).toBe(stopped);
  expect(controller.signal.aborted).toBe(true);
  await Bun.sleep(10);
  expect(events).toEqual(["poll aborted"]);

  release();
  await stopped;
  expect(events).toEqual(["poll aborted", "slow run finished", "closed"]);
});
