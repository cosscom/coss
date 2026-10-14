import { describe, expect, test } from "bun:test";
import { Coss, type List, type RiskAssessment, type RiskListEntry } from "../src/index.ts";
import { apiError, json, mockFetch } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";
const BASE = "https://api.coss.com/v1/risk";

const assessment: RiskAssessment = {
  object: "risk_assessment",
  id: "rsk_01k5f9yq8re8vb6q2wmz0tb2xd",
  event: "signup",
  event_name: null,
  decision: "review",
  score: 0.62,
  reasons: [
    {
      code: "email.typo",
      message: "The domain looks like a typo of gmail.com.",
      suggestion: "gmail.com",
    },
  ],
  signals: { email: null, ip: null, velocity: { ip_1h: 1 } },
  user: { id: null, email: "x@gmail.con" },
  ip: "203.0.113.7",
  degraded: [],
  outcome: null,
  review_status: "open",
  created_at: "2026-10-14T12:00:00.000Z",
};

const entry: RiskListEntry = {
  object: "risk_list_entry",
  id: "rskle_01k5f9yq8re8vb6q2wmz0tb2xd",
  list: "block",
  type: "domain",
  value: "evil.example",
  note: null,
  expires_at: null,
  created_at: "2026-10-14T12:00:00.000Z",
};

function client(...handlers: Parameters<typeof mockFetch>) {
  const { fetch, calls } = mockFetch(...handlers);
  return { risk: new Coss({ apiKey: API_KEY, fetch, maxRetries: 1 }).risk, calls };
}

describe("coss.risk", () => {
  test("assess POSTs the event and retries with the same idempotency key", async () => {
    const { risk, calls } = client(
      apiError(503, { type: "api_error", code: "unavailable" }),
      json(201, assessment),
    );
    const params = { event: "signup" as const, user: { email: "x@gmail.con" }, ip: "203.0.113.7" };
    expect(await risk.assess(params)).toEqual({ data: assessment, error: null });
    expect(calls.map((call) => [call.method, call.url])).toEqual([
      ["POST", `${BASE}/assessments`],
      ["POST", `${BASE}/assessments`],
    ]);
    expect(JSON.parse(calls[1]?.body ?? "")).toEqual(params);
    const key = calls[0]?.headers.get("idempotency-key");
    expect(key).toBeTruthy();
    expect(calls[1]?.headers.get("idempotency-key")).toBe(key);
  });

  test("errors are returned, never thrown", async () => {
    const { risk } = client(
      apiError(422, { type: "invalid_request_error", code: "validation_error" }),
    );
    const result = await risk.assess({ event: "custom" });
    expect(result.data).toBeNull();
    expect(result.error).toMatchObject({ type: "invalid_request_error", code: "validation_error" });
  });

  test("feedback, assessments.get/list, users.forget", async () => {
    const { risk, calls } = client(
      json(200, { ...assessment, outcome: "fraud", review_status: "resolved" }),
      json(200, assessment),
      json(200, {
        object: "list",
        data: [assessment],
        has_more: false,
      } satisfies List<RiskAssessment>),
      json(200, { object: "risk_user", id: "u 1", deleted: true }),
    );
    expect((await risk.feedback(assessment.id, { outcome: "fraud" })).data?.outcome).toBe("fraud");
    await risk.assessments.get(assessment.id);
    await risk.assessments.list({ review_status: "open", limit: 10 });
    expect((await risk.users.forget("u 1")).data).toEqual({
      object: "risk_user",
      id: "u 1",
      deleted: true,
    });
    expect(calls.map((call) => [call.method, call.url])).toEqual([
      ["POST", `${BASE}/assessments/${assessment.id}/feedback`],
      ["GET", `${BASE}/assessments/${assessment.id}`],
      ["GET", `${BASE}/assessments?review_status=open&limit=10`],
      ["DELETE", `${BASE}/users/u%201`],
    ]);
    expect(JSON.parse(calls[0]?.body ?? "")).toEqual({ outcome: "fraud" });
  });

  test("lists.add maps the shorthand to the wire form", async () => {
    const { risk, calls } = client(json(201, entry));
    await risk.lists.add("block", { domain: "evil.example", note: "Card testing" });
    await risk.lists.add("allow", { asn: 64500, expires_at: new Date("2027-01-01T00:00:00Z") });
    expect(calls.map((call) => JSON.parse(call.body ?? ""))).toEqual([
      { list: "block", type: "domain", value: "evil.example", note: "Card testing" },
      { list: "allow", type: "asn", value: "64500", expires_at: "2027-01-01T00:00:00.000Z" },
    ]);
  });

  test("lists.list, get and remove", async () => {
    const { risk, calls } = client(
      json(200, { object: "list", data: [entry], has_more: false }),
      json(200, entry),
      json(200, { object: "risk_list_entry", id: entry.id, deleted: true }),
    );
    await risk.lists.list({ list: "block" });
    await risk.lists.get(entry.id);
    expect((await risk.lists.remove(entry.id)).data).toEqual({
      object: "risk_list_entry",
      id: entry.id,
      deleted: true,
    });
    expect(calls.map((call) => [call.method, call.url])).toEqual([
      ["GET", `${BASE}/list_entries?list=block`],
      ["GET", `${BASE}/list_entries/${entry.id}`],
      ["DELETE", `${BASE}/list_entries/${entry.id}`],
    ]);
  });
});
