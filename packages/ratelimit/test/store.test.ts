import { afterAll, describe, expect, test } from "bun:test";
import type { LimitSpec } from "../src/gcra.ts";
import { MemoryStore, type RateLimitStore, ValkeyStore } from "../src/store.ts";
import { testPrefix, testValkeyStore } from "../src/testing.ts";

/** Waits in real time (Valkey uses its own clock); the memory store gets a manual clock instead. */
type Harness = { store: RateLimitStore; advance: (ms: number) => Promise<void> };

function memoryHarness(): Harness {
  let now = 1_700_000_000_000;
  return {
    store: new MemoryStore({ now: () => now }),
    advance: async (ms) => {
      now += ms;
    },
  };
}

const valkey = await testValkeyStore();
afterAll(() => valkey.close());

const harnesses: [string, () => Harness][] = [
  ["memory", memoryHarness],
  ["valkey", () => ({ store: valkey, advance: (ms) => Bun.sleep(ms) })],
];

function spec(name: string, rule: { limit: number; periodMs: number; burst?: number }): LimitSpec {
  return {
    key: `${testPrefix()}:{t}:${name}`,
    intervalMs: rule.periodMs / rule.limit,
    burst: rule.burst ?? rule.limit,
  };
}

describe.each(harnesses)("%s store", (_name, make) => {
  test("allows the burst, then denies with a retry-after", async () => {
    const { store } = make();
    const s = spec("burst", { limit: 3, periodMs: 60_000 });
    for (const expected of [2, 1, 0]) {
      const result = await store.consume([s], { cost: 1 });
      expect(result.allowed).toBe(true);
      expect(result.limits[0]?.remaining).toBe(expected);
    }
    const denied = await store.consume([s], { cost: 1 });
    expect(denied.allowed).toBe(false);
    expect(denied.limits[0]?.remaining).toBe(0);
    const retry = denied.limits[0]?.retryAfterMs ?? 0;
    expect(retry).toBeGreaterThan(19_000);
    expect(retry).toBeLessThanOrEqual(20_000);
    expect(denied.limits[0]?.resetMs).toBeGreaterThan(59_000);
  });

  test("refills over time", async () => {
    const { store, advance } = make();
    const s = spec("refill", { limit: 2, periodMs: 200 });
    await store.consume([s], { cost: 2 });
    expect((await store.consume([s], { cost: 1 })).allowed).toBe(false);
    await advance(120);
    expect((await store.consume([s], { cost: 1 })).allowed).toBe(true);
  });

  test("charges several buckets all or nothing", async () => {
    const { store } = make();
    const roomy = spec("roomy", { limit: 100, periodMs: 60_000 });
    const tight = spec("tight", { limit: 2, periodMs: 60_000 });
    expect((await store.consume([roomy, tight], { cost: 2 })).allowed).toBe(true);
    const denied = await store.consume([roomy, tight], { cost: 1 });
    expect(denied.allowed).toBe(false);
    expect(denied.limits[0]?.retryAfterMs).toBe(0);
    // The roomy bucket was not charged for the denied request.
    const peek = await store.consume([roomy], { cost: 1, peek: true });
    expect(peek.limits[0]?.remaining).toBe(97);
  });

  test("a cost larger than the bucket never fits", async () => {
    const { store } = make();
    const s = spec("huge", { limit: 10, periodMs: 1000 });
    const result = await store.consume([s], { cost: 11 });
    expect(result.allowed).toBe(false);
    expect(result.limits[0]?.retryAfterMs).toBeNull();
  });

  test("refunds give tokens back, up to a full bucket", async () => {
    const { store } = make();
    const s = spec("refund", { limit: 5, periodMs: 60_000 });
    await store.consume([s], { cost: 5 });
    await store.consume([s], { cost: -2 });
    expect((await store.consume([s], { cost: 1, peek: true })).limits[0]?.remaining).toBe(1);
    await store.consume([s], { cost: -100 });
    expect((await store.consume([s], { cost: 1, peek: true })).limits[0]?.remaining).toBe(4);
  });

  test("peek does not charge", async () => {
    const { store } = make();
    const s = spec("peek", { limit: 1, periodMs: 60_000 });
    expect((await store.consume([s], { cost: 1, peek: true })).allowed).toBe(true);
    expect((await store.consume([s], { cost: 1 })).allowed).toBe(true);
    expect((await store.consume([s], { cost: 1, peek: true })).allowed).toBe(false);
  });
});

describe("valkey store", () => {
  test("keys expire once the bucket is full again", async () => {
    const s = spec("ttl", { limit: 10, periodMs: 10_000 });
    await valkey.consume([s], { cost: 3 });
    const ttl = await valkey.client.pttl(s.key);
    expect(ttl).toBeGreaterThan(2_000);
    expect(ttl).toBeLessThanOrEqual(3_000);
  });

  test("recovers when the script cache was flushed", async () => {
    const s = spec("noscript", { limit: 5, periodMs: 1000 });
    await valkey.client.script("FLUSH");
    expect((await valkey.consume([s], { cost: 1 })).allowed).toBe(true);
  });

  test("times out a command itself (cluster connections carry no command timeout)", async () => {
    // A client whose script call never answers, as a stuck cluster node would.
    const hung = { evalsha: () => new Promise(() => {}) } as unknown as ConstructorParameters<
      typeof ValkeyStore
    >[0];
    const store = new ValkeyStore(hung, { commandTimeoutMs: 50 });
    const started = Date.now();
    await expect(
      store.consume([spec("hung", { limit: 1, periodMs: 1000 })], { cost: 1 }),
    ).rejects.toThrow("Command timed out");
    expect(Date.now() - started).toBeLessThan(1000);
  });

  test("fails fast when the server is unreachable", async () => {
    const down = ValkeyStore.connect({
      url: "redis://127.0.0.1:1",
      commandTimeoutMs: 100,
      onError: () => {},
    });
    const started = Date.now();
    await expect(
      down.consume([spec("down", { limit: 1, periodMs: 1000 })], { cost: 1 }),
    ).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(1000);
    await down.close();
  });
});
