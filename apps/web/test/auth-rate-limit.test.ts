import { describe, expect, test } from "bun:test";
import { clientIpResolver, createRateLimiter, MemoryStore } from "@coss/ratelimit";
import { AUTH_RATE_LIMITS, withAuthRateLimit } from "../src/lib/auth-rate-limit";

function setup() {
  const seen: Request[] = [];
  const deps = {
    limiter: createRateLimiter({ store: new MemoryStore() }),
    clientIp: clientIpResolver({ header: "x-forwarded-for" }),
  };
  const handler = withAuthRateLimit(
    async (request) => {
      seen.push(request);
      return Response.json({ ok: true });
    },
    () => deps,
  );
  return { handler, seen };
}

function post(path: string, body: unknown, ip = "198.51.100.1"): Request {
  return new Request(`http://localhost:3000/api/auth${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("withAuthRateLimit", () => {
  test("limits sign-in per email address, case-insensitively", async () => {
    const { handler, seen } = setup();
    for (let i = 0; i < 5; i++) {
      const email = i % 2 ? "Ann@Example.com" : "ann@example.com";
      expect(
        (await handler(post("/sign-in/email", { email, password: "x" }, `10.0.0.${i}`))).status,
      ).toBe(200);
    }
    const limited = await handler(post("/sign-in/email", { email: "ann@example.com" }, "10.0.0.9"));
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(await limited.json()).toMatchObject({ code: "TOO_MANY_REQUESTS" });
    // The handler still reads the body it was given.
    expect(await seen[0]?.json()).toEqual({ email: "ann@example.com", password: "x" });
    expect(
      (await handler(post("/sign-in/email", { email: "bob@example.com" }, "10.0.0.9"))).status,
    ).toBe(200);
  });

  test("limits sign-up per client IP", async () => {
    const { handler } = setup();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await handler(post("/sign-up/email", { email: `u${i}@example.com` }))).status);
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    expect((await handler(post("/sign-up/email", {}, "198.51.100.2"))).status).toBe(200);
  });

  test("limits SSO sign-in starts and SAML responses per client IP, sharing one bucket", async () => {
    const { handler } = setup();
    const statuses: number[] = [];
    for (let i = 0; i < 10; i++) {
      statuses.push((await handler(post("/sign-in/sso", { email: "a@acme.com" }))).status);
      statuses.push((await handler(post("/sso/saml2/sp/acs/sso_x", {}))).status);
    }
    expect(statuses.every((status) => status === 200)).toBe(true);
    expect((await handler(post("/sso/saml2/sp/acs/sso_y", {}))).status).toBe(429);
    expect((await handler(post("/sso/saml2/sp/metadata", {}))).status).toBe(200);
  });

  test("passes other paths and trailing slashes through to the right rule", async () => {
    const { handler, seen } = setup();
    for (let i = 0; i < 50; i++) await handler(post("/sign-out", {}));
    expect(seen).toHaveLength(50);
    for (let i = 0; i < 3; i++) {
      await handler(post("/request-password-reset/", { email: "c@example.com" }, `10.1.0.${i}`));
    }
    expect(
      (await handler(post("/request-password-reset", { email: "c@example.com" }))).status,
    ).toBe(429);
  });

  test("every limited path maps to existing buckets", () => {
    for (const limits of Object.values(AUTH_RATE_LIMITS)) {
      expect(limits.ip.endsWith(".ip")).toBe(true);
      if (limits.email) expect(limits.email.endsWith(".email")).toBe(true);
    }
  });
});
