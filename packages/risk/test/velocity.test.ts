import { afterAll, describe, expect, test } from "bun:test";
import { testPrefix, testValkeyStore } from "@coss/ratelimit/testing";
import {
  MemoryVelocityStore,
  ValkeyVelocityStore,
  VELOCITY_BUCKET_MS,
  velocityKey,
} from "../src/velocity.ts";

describe("MemoryVelocityStore", () => {
  test("counts per key over the last hour and day", async () => {
    let now = 1_000 * VELOCITY_BUCKET_MS;
    const store = new MemoryVelocityStore({ now: () => now });
    expect(await store.increment(["a", "b"])).toMatchObject([
      { "1h": 1, "24h": 1 },
      { "1h": 1, "24h": 1 },
    ]);
    await store.increment(["a"]);
    now += 61 * 60_000;
    expect(await store.increment(["a"])).toMatchObject([{ "1h": 1, "24h": 3 }]);
    now += 24 * 60 * 60_000;
    expect(await store.increment(["a"])).toMatchObject([{ "1h": 1, "24h": 1 }]);
  });

  test("a take-back goes into the bucket the event was counted in", async () => {
    let now = 1_000 * VELOCITY_BUCKET_MS + VELOCITY_BUCKET_MS - 1;
    const store = new MemoryVelocityStore({ now: () => now });
    const [counted] = await store.increment(["a"]);
    now += 2; // the next 5-minute bucket
    await store.increment(["a"], { by: -1, buckets: [counted?.bucket ?? 0] });
    now += 61 * 60_000; // the counted bucket has left the hour
    expect(await store.increment(["a"], { by: 0 })).toMatchObject([{ "1h": 0, "24h": 0 }]);
  });

  test("by: 0 only reads", async () => {
    const store = new MemoryVelocityStore();
    expect(await store.increment(["a"], { by: 0 })).toMatchObject([{ "1h": 0, "24h": 0 }]);
    await store.increment(["a"]);
    expect(await store.increment(["a"], { by: 0 })).toMatchObject([{ "1h": 1, "24h": 1 }]);
    expect(await store.increment(["a"], { by: -1 })).toMatchObject([{ "1h": 0, "24h": 0 }]);
  });
});

describe("ValkeyVelocityStore", async () => {
  const valkey = await testValkeyStore();
  afterAll(() => valkey.close());
  const store = new ValkeyVelocityStore(valkey.client);
  const prefix = testPrefix();

  test("counts atomically in Valkey, one key per counter", async () => {
    const a = velocityKey(prefix, "signup", "ip", "hash-a");
    const b = velocityKey(prefix, "signup", "ip", "hash-b");
    expect(a).toBe(`${prefix}:risk:v:signup:ip:{hash-a}`);
    const results = await Promise.all(Array.from({ length: 10 }, () => store.increment([a])));
    expect(results.map((r) => r[0]?.["1h"]).sort((x, y) => (x ?? 0) - (y ?? 0))).toMatchObject([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(await store.increment([a, b])).toMatchObject([
      { "1h": 11, "24h": 11 },
      { "1h": 1, "24h": 1 },
    ]);
    expect(await valkey.client.pttl(a)).toBeGreaterThan(24 * 60 * 60_000);
    expect(await store.increment([a], { by: 0 })).toMatchObject([{ "1h": 11, "24h": 11 }]);
    const unseen = velocityKey(prefix, "signup", "ip", "hash-c");
    expect(await store.increment([unseen], { by: 0 })).toMatchObject([{ "1h": 0, "24h": 0 }]);
    expect(await valkey.client.exists(unseen)).toBe(0);
    expect(await store.increment([a], { by: -1 })).toMatchObject([{ "1h": 10, "24h": 10 }]);
  });
});
