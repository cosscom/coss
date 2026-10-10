import { describe, expect, test } from "bun:test";
import { ID_PREFIXES, isId, newId } from "../src/id.ts";

describe("newId", () => {
  test("produces <prefix>_<26 char base32>", () => {
    const id = newId("email");
    expect(id).toMatch(/^email_[0-7][0-9a-hjkmnp-tv-z]{25}$/);
    expect(isId("email", id)).toBe(true);
  });

  test("ids are unique", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId("proj")));
    expect(ids.size).toBe(1000);
  });

  test("ids sort by creation time", () => {
    const a = newId("env", 1_700_000_000_000);
    const b = newId("env", 1_700_000_000_001);
    const c = newId("env", 1_800_000_000_000);
    expect([c, a, b].sort()).toEqual([a, b, c]);
  });

  test("rejects invalid prefixes", () => {
    for (const bad of ["", "Email", "em1", "_x", "x_", "a-b"]) {
      expect(() => newId(bad)).toThrow();
    }
  });

  test("every registered prefix is valid", () => {
    for (const prefix of Object.values(ID_PREFIXES)) {
      expect(isId(prefix, newId(prefix))).toBe(true);
    }
  });
});

describe("isId", () => {
  test("rejects wrong prefix, bad length and bad alphabet", () => {
    const id = newId("email");
    expect(isId("proj", id)).toBe(false);
    expect(isId("email", `${id}x`)).toBe(false);
    expect(isId("email", "email_8zzzzzzzzzzzzzzzzzzzzzzzzz")).toBe(false); // first char > 7
    expect(isId("email", "email_0123456789abcdefghijklmnop".slice(0, 32))).toBe(false); // contains i/l/o
    expect(isId("email", 42)).toBe(false);
  });
});
