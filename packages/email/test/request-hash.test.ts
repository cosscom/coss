import { describe, expect, test } from "bun:test";
import { canonicalJson, hashSendRequest } from "../src/request-hash.ts";
import { SendEmailRequest } from "../src/schemas.ts";

describe("canonicalJson", () => {
  test("sorts keys at every level and keeps array order", () => {
    expect(canonicalJson({ b: 1, a: { d: [3, { z: 1, y: 2 }], c: null }, e: undefined })).toBe(
      '{"a":{"c":null,"d":[3,{"y":2,"z":1}]},"b":1}',
    );
  });
});

describe("hashSendRequest", () => {
  test("is independent of how equivalent input was spelled", () => {
    const a = SendEmailRequest.parse({
      from: "hello@acme.com",
      to: "user@example.com",
      subject: "Hi",
      text: "x",
      headers: { "X-A": "1", "X-B": "2" },
    });
    const b = SendEmailRequest.parse({
      headers: { "x-b": "2", "x-a": "1" },
      text: "x",
      subject: "Hi",
      to: ["user@example.com"],
      cc: [],
      from: "hello@acme.com",
    });
    expect(hashSendRequest(a)).toBe(hashSendRequest(b));
    expect(hashSendRequest(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSendRequest({ ...a, subject: "Hi!" })).not.toBe(hashSendRequest(a));
    expect(hashSendRequest({ ...a, category: "news" })).not.toBe(hashSendRequest(a));
    expect(hashSendRequest({ ...a, scheduled_at: "2026-10-11T09:00:00.000Z" })).not.toBe(
      hashSendRequest(a),
    );
  });

  test("is unchanged for requests without a category or schedule (retries across deploys)", () => {
    const parsed = SendEmailRequest.parse({
      from: "hello@acme.com",
      to: "user@example.com",
      subject: "Hi",
      text: "x",
    });
    expect(Object.hasOwn(parsed, "category")).toBe(false);
    expect(canonicalJson(parsed)).not.toContain("category");
    expect(Object.hasOwn(parsed, "scheduled_at")).toBe(false);
    expect(canonicalJson(parsed)).not.toContain("scheduled_at");
  });

  test("is unchanged for requests without tracking, and covers the tracking given", () => {
    const base = { from: "hello@acme.com", to: "user@example.com", subject: "Hi", text: "x" };
    const parsed = SendEmailRequest.parse(base);
    expect(Object.hasOwn(parsed, "tracking")).toBe(false);
    expect(canonicalJson(parsed)).not.toContain("tracking");
    const empty = SendEmailRequest.parse({ ...base, tracking: {} });
    const opens = SendEmailRequest.parse({ ...base, tracking: { opens: true } });
    expect(canonicalJson(empty)).toContain('"tracking":{}');
    expect(hashSendRequest(opens)).not.toBe(hashSendRequest(empty));
    expect(() => SendEmailRequest.parse({ ...base, tracking: { pixels: true } })).toThrow();
  });
});
