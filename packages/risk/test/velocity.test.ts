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
    expect(await store.increment(["a", "b"])).toEqual([
      { "1h": 1, "24h": 1 },
      { "1h": 1, "24h": 1 },
    ]);
    await store.increment(["a"]);
    now += 61 * 60_000;
    expect(await store.increment(["a"])).toEqual([{ "1h": 1, "24h": 3 }]);
    now += 24 * 60 * 60_000;
    expect(await store.increment(["a"])).toEqual([{ "1h": 1, "24h": 1 }]);
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
    expect(results.map((r) => r[0]?.["1h"]).sort((x, y) => (x ?? 0) - (y ?? 0))).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(await store.increment([a, b])).toEqual([
      { "1h": 11, "24h": 11 },
      { "1h": 1, "24h": 1 },
    ]);
    expect(await valkey.client.pttl(a)).toBeGreaterThan(24 * 60 * 60_000);
  });
});
