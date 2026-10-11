/** The reputation resource: request shape, and how results come back. */
import { describe, expect, test } from "bun:test";
import { Coss, type Reputation } from "../src/index.ts";
import { apiError, json, mockFetch } from "./helpers.ts";

const API_KEY = "coss_live_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";

const sampleReputation: Reputation = {
  object: "reputation",
  status: "warning",
  reason: "bounce_rate",
  status_changed_at: "2026-10-10T12:00:00.000Z",
  evaluated_at: "2026-10-10T12:00:00.000Z",
  window: { start: "2026-10-03T12:00:00.000Z", end: "2026-10-10T12:00:00.000Z" },
  checks: [
    {
      trigger: "bounce_rate",
      severity: "warning",
      message: "Bounce rate 5.00% is at or above the 4.00% warning threshold.",
      rate: 0.05,
      count: 50,
      volume: 1000,
      warning_threshold: 0.04,
      suspend_threshold: 0.08,
      minimum_volume: 200,
    },
  ],
};

function client(...handlers: Parameters<typeof mockFetch>) {
  const { fetch, calls } = mockFetch(...handlers);
  return { coss: new Coss({ apiKey: API_KEY, baseUrl: "https://api.test", fetch }), calls };
}

describe("coss.reputation", () => {
  test("get reads the organization's reputation", async () => {
    const { coss, calls } = client(json(200, sampleReputation));

    const result = await coss.reputation.get();

    expect(result).toEqual({ data: sampleReputation, error: null });
    expect(calls[0]).toMatchObject({ method: "GET", url: "https://api.test/v1/reputation" });
    expect(calls[0]?.body).toBeNull();
  });

  test("a missing permission comes back as an error, never thrown", async () => {
    const { coss } = client(
      apiError(403, { type: "permission_error", code: "insufficient_permissions" }),
    );

    const result = await coss.reputation.get();

    expect(result.data).toBeNull();
    expect(result.error).toMatchObject({ type: "permission_error", status: 403 });
  });
});
