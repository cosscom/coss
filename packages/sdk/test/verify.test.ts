import { describe, expect, test } from "bun:test";
import { Coss, type List, type Verification, type VerificationCheck } from "../src/index.ts";
import { json, mockFetch } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";
const BASE = "https://api.coss.com/v1/verifications";

const verification: Verification = {
  object: "verification",
  id: "vrf_01k8e2m4q2f3e9v6t5r1n0p8yz",
  channel: "sms",
  to: "+14155550199",
  country: "US",
  status: "pending",
  failure: null,
  reasons: [],
  attempts: 0,
  max_attempts: 5,
  sends: [
    {
      channel: "sms",
      route: "shared_number",
      sms_id: null,
      email_id: null,
      created_at: "2026-11-10T12:00:00.000Z",
    },
  ],
  tags: [],
  sandbox: true,
  expires_at: "2026-11-10T12:10:00.000Z",
  approved_at: null,
  created_at: "2026-11-10T12:00:00.000Z",
};

function client(...handlers: Parameters<typeof mockFetch>) {
  const { fetch, calls } = mockFetch(...handlers);
  return { coss: new Coss({ apiKey: API_KEY, fetch }), calls };
}

describe("coss.verify", () => {
  test("start and check POST with idempotency keys", async () => {
    const checked: VerificationCheck = {
      object: "verification_check",
      valid: true,
      verification: { ...verification, status: "approved" },
    };
    const { coss, calls } = client(json(201, verification), json(200, checked));
    const started = await coss.verify.start({ to: "+14155550199", ip: "203.0.113.7" });
    expect(started).toEqual({ data: verification, error: null });
    expect(calls[0]).toMatchObject({ method: "POST", url: BASE });
    expect(calls[0]?.headers.get("idempotency-key")).toBeTruthy();
    const result = await coss.verify.check({ to: "+14155550199", code: "000000" });
    expect(result.data?.valid).toBe(true);
    expect(calls[1]).toMatchObject({ method: "POST", url: `${BASE}/check` });
    expect(calls[1]?.headers.get("idempotency-key")).toBeTruthy();
  });

  test("get, list and cancel", async () => {
    const page: List<Verification> = { object: "list", data: [verification], has_more: false };
    const { coss, calls } = client(
      json(200, verification),
      json(200, page),
      json(200, verification),
    );
    await coss.verify.get(verification.id);
    expect(calls[0]?.url).toBe(`${BASE}/${verification.id}`);
    await coss.verify.list({ status: "blocked", limit: 5 });
    expect(calls[1]?.url).toBe(`${BASE}?status=blocked&limit=5`);
    await coss.verify.cancel(verification.id);
    expect(calls[2]).toMatchObject({ method: "POST", url: `${BASE}/${verification.id}/cancel` });
  });
});
