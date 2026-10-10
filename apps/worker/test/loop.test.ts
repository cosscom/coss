import { describe, expect, spyOn, test } from "bun:test";
import { startLoop } from "../src/loop.ts";

describe("startLoop", () => {
  test("runs immediately, repeats without overlapping, and stop waits for the current run", async () => {
    let running = 0;
    let maxRunning = 0;
    let runs = 0;
    let finished = 0;
    const loop = startLoop({
      name: "test",
      intervalMs: 5,
      run: async () => {
        runs++;
        running++;
        maxRunning = Math.max(maxRunning, running);
        await Bun.sleep(10);
        running--;
        finished++;
      },
    });
    expect(runs).toBe(1);
    await Bun.sleep(60);
    await loop.stop();
    const afterStop = runs;
    await Bun.sleep(30);

    expect(maxRunning).toBe(1);
    expect(runs).toBeGreaterThan(1);
    expect(runs).toBe(afterStop);
    expect(finished).toBe(runs);
  });

  test("keeps going after a failed run, and continues at once after a full batch", async () => {
    const error = spyOn(console, "error").mockImplementation(() => {});
    let runs = 0;
    const loop = startLoop({
      name: "test",
      intervalMs: 60_000,
      run: async () => {
        runs++;
        if (runs === 1) return true;
        if (runs === 2) throw new Error("boom");
        return false;
      },
    });
    await Bun.sleep(20);
    await loop.stop();
    // Run 2 followed run 1's full batch immediately; run 2's failure waits for the interval.
    expect(runs).toBe(2);
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });
});
