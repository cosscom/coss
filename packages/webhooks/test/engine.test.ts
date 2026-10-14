import { describe, expect, test } from "bun:test";
import {
  DISABLE_FAILING_ENDPOINT_AFTER_MS,
  deliveryOutcome,
  endpointHealth,
  runClaimed,
} from "../src/engine/index.ts";

const schedule = [1_000, 10_000];
const now = new Date("2026-10-14T12:00:00.000Z");

describe("deliveryOutcome", () => {
  test("succeeds, schedules retries, and gives up after the last delay", () => {
    expect(deliveryOutcome({ attemptCount: 0, succeeded: true, schedule, now })).toEqual({
      status: "succeeded",
      attemptCount: 1,
      nextAttemptAt: null,
      exhausted: false,
    });
    expect(deliveryOutcome({ attemptCount: 1, succeeded: false, schedule, now })).toEqual({
      status: "pending",
      attemptCount: 2,
      nextAttemptAt: new Date(now.getTime() + 10_000),
      exhausted: false,
    });
    expect(deliveryOutcome({ attemptCount: 2, succeeded: false, schedule, now })).toEqual({
      status: "failed",
      attemptCount: 3,
      nextAttemptAt: null,
      exhausted: true,
    });
  });

  test("jitter only ever shortens a delay, by at most 10%", () => {
    const at = (random: number) =>
      deliveryOutcome({
        attemptCount: 1,
        succeeded: false,
        schedule,
        now,
        random: () => random,
      }).nextAttemptAt?.getTime();
    expect(at(0)).toBe(now.getTime() + 10_000);
    expect(at(0.5)).toBe(now.getTime() + 9_500);
    expect(at(0.999_999)).toBe(now.getTime() + 9_001);
  });
});

describe("endpointHealth", () => {
  const since = new Date(now.getTime() - DISABLE_FAILING_ENDPOINT_AFTER_MS);

  test("a success clears a streak; retries change nothing", () => {
    expect(endpointHealth({ failingSince: since, succeeded: true, final: true, now })).toEqual({
      kind: "recovered",
    });
    expect(endpointHealth({ failingSince: null, succeeded: true, final: true, now })).toEqual({
      kind: "none",
    });
    expect(endpointHealth({ failingSince: null, succeeded: false, final: false, now })).toEqual({
      kind: "none",
    });
  });

  test("a final failure starts a streak, and one past the threshold disables", () => {
    expect(endpointHealth({ failingSince: null, succeeded: false, final: true, now })).toEqual({
      kind: "failing",
      since: now,
    });
    expect(
      endpointHealth({
        failingSince: new Date(since.getTime() + 1),
        succeeded: false,
        final: true,
        now,
      }),
    ).toEqual({ kind: "none" });
    expect(endpointHealth({ failingSince: since, succeeded: false, final: true, now })).toEqual({
      kind: "disable",
      failingSince: since,
    });
  });
});

describe("runClaimed", () => {
  test("never runs more than `concurrency` at once and releases items that throw", async () => {
    let running = 0;
    let peak = 0;
    const released: number[] = [];
    const errors: unknown[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => errors.push(args);
    try {
      await runClaimed(
        [1, 2, 3, 4, 5, 6],
        { concurrency: 2, label: (n) => `item ${n}` },
        async (n) => {
          running++;
          peak = Math.max(peak, running);
          await new Promise((resolve) => setTimeout(resolve, 5));
          running--;
          if (n === 4) throw new Error("boom");
        },
        async (n) => {
          released.push(n);
        },
      );
    } finally {
      console.error = original;
    }
    expect(peak).toBe(2);
    expect(released).toEqual([4]);
    expect(errors).toHaveLength(1);
  });
});
