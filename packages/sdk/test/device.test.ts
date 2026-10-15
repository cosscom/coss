import { afterEach, describe, expect, test } from "bun:test";
import { collectDevice } from "../src/device.ts";

type Payload = {
  id: string;
  t: number;
  tz: string | null;
  l: string[];
  p: string | null;
  s: [number, number] | null;
  tp: number | null;
  wd: boolean;
  hl: boolean;
};

function decode(token: string): Payload {
  expect(token.startsWith("cd1.")).toBe(true);
  return JSON.parse(Buffer.from(token.slice(4), "base64url").toString("utf8"));
}

/** A `localStorage` stand-in; `blocked` throws like Safari's private mode used to. */
function fakeStorage(blocked = false) {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => {
      if (blocked) throw new Error("SecurityError");
      return items.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (blocked) throw new Error("SecurityError");
      items.set(key, value);
    },
  };
}

const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
afterEach(() => {
  if (original) Object.defineProperty(globalThis, "localStorage", original);
  else delete (globalThis as { localStorage?: unknown }).localStorage;
});

function useStorage(storage: unknown) {
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
}

describe("collectDevice", () => {
  test("keeps one id in localStorage across calls", () => {
    const storage = fakeStorage();
    useStorage(storage);
    const first = decode(collectDevice());
    const second = decode(collectDevice());
    expect(first.id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(second.id).toBe(first.id);
    expect(storage.items.get("coss_device_id")).toBe(first.id);
    expect(Math.abs(first.t - Date.now())).toBeLessThan(5000);
    expect(typeof first.wd).toBe("boolean");
    expect(first.hl).toBe(false);
  });

  test("falls back to an id for the page when storage is blocked or declined", () => {
    useStorage(fakeStorage(true));
    const blocked = decode(collectDevice());
    expect(blocked.id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    const storage = fakeStorage();
    useStorage(storage);
    expect(decode(collectDevice({ storage: "memory" })).id).toBe(blocked.id);
    expect(storage.items.size).toBe(0);
  });

  test("reports the time zone and stays small", () => {
    useStorage(fakeStorage());
    const token = collectDevice();
    expect(decode(token).tz).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(token.length).toBeLessThan(1024);
  });
});
