import { describe, expect, test } from "bun:test";
import { type AuditEvent, Coss, type List } from "../src/index.ts";
import { apiError, json, mockFetch } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";

const event: AuditEvent = {
  object: "audit_event",
  id: "oaudit_01k5f9yq8re8vb6q2wmz0tb2xd",
  created_at: "2026-10-09T12:00:00.000Z",
  actor_type: "api_key",
  actor_id: "key_01k5f9yq8re8vb6q2wmz0tb2xd",
  actor_label: "key_01k5f9yq8re8vb6q2wmz0tb2xd",
  action: "domain.created",
  target_type: "domain",
  target_id: "dom_01k5f9yq8re8vb6q2wmz0tb2xd",
  target_label: "example.com",
  project_id: null,
  environment_id: null,
  metadata: { request_id: "req_01k5f9yq8re8vb6q2wmz0tb2xd" },
  client_ip: null,
  user_agent: "coss-node",
};

function client(...handlers: Parameters<typeof mockFetch>) {
  const { fetch, calls } = mockFetch(...handlers);
  return { auditEvents: new Coss({ apiKey: API_KEY, fetch }).auditEvents, calls };
}

describe("coss.auditEvents", () => {
  test("list joins lists and serializes dates", async () => {
    const page: List<AuditEvent> = { object: "list", data: [event], has_more: false };
    const { auditEvents, calls } = client(json(200, page));
    const result = await auditEvents.list({
      action: ["domain.", "api_key.created"],
      actor_type: "api_key",
      from: new Date("2026-10-09T00:00:00Z"),
      limit: 10,
      after: undefined,
    });
    expect(result).toEqual({ data: page, error: null });
    const url = new URL(calls[0]?.url ?? "");
    expect(url.pathname).toBe("/v1/audit_events");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      action: "domain.,api_key.created",
      actor_type: "api_key",
      from: "2026-10-09T00:00:00.000Z",
      limit: "10",
    });
  });

  test("get encodes the id; errors are returned", async () => {
    const { auditEvents, calls } = client(
      json(200, event),
      apiError(404, { type: "not_found_error", code: "not_found" }),
    );
    expect(await auditEvents.get(event.id)).toEqual({ data: event, error: null });
    expect(calls[0]?.url).toBe(`https://api.coss.com/v1/audit_events/${event.id}`);
    const missing = await auditEvents.get("oaudit_x/y");
    expect(calls[1]?.url).toBe("https://api.coss.com/v1/audit_events/oaudit_x%2Fy");
    expect(missing.error?.code).toBe("not_found");
  });
});
