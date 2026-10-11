import { describe, expect, test } from "bun:test";
import { Coss, type List, type Log } from "../src/index.ts";
import { apiError, json, mockFetch } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";

const log: Log = {
  object: "log",
  id: "log_01k5f9yq8re8vb6q2wmz0tb2xd",
  occurred_at: "2026-10-09T12:00:00.000Z",
  source: "api",
  level: "warning",
  type: "api.request",
  message: "POST /v1/emails 422",
  request_id: "req_01k5f9yq8re8vb6q2wmz0tb2xd",
  api_key_id: "key_01k5f9yq8re8vb6q2wmz0tb2xd",
  method: "POST",
  path: "/v1/emails",
  route: "/v1/emails",
  status_code: 422,
  duration_ms: 12,
  client_ip: null,
  user_agent: "coss-node",
  error_code: "validation_error",
  resource_type: null,
  resource_id: null,
  recipient: null,
  attributes: {},
};

function client(...handlers: Parameters<typeof mockFetch>) {
  const { fetch, calls } = mockFetch(...handlers);
  return { logs: new Coss({ apiKey: API_KEY, fetch }).logs, calls };
}

describe("coss.logs", () => {
  test("list joins lists and serializes dates", async () => {
    const page: List<Log> = { object: "list", data: [log], has_more: false };
    const { logs, calls } = client(json(200, page));
    const result = await logs.list({
      from: new Date("2026-10-09T00:00:00Z"),
      level: ["warning", "error"],
      status: ["4xx", 503],
      source: "api",
      q: "a b",
      after: undefined,
    });
    expect(result).toEqual({ data: page, error: null });
    const url = new URL(calls[0]?.url ?? "");
    expect(url.pathname).toBe("/v1/logs");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      from: "2026-10-09T00:00:00.000Z",
      level: "warning,error",
      status: "4xx,503",
      source: "api",
      q: "a b",
    });
  });

  test("get encodes the id; errors are returned", async () => {
    const { logs, calls } = client(
      json(200, log),
      apiError(404, { type: "not_found_error", code: "not_found" }),
    );
    expect(await logs.get(log.id)).toEqual({ data: log, error: null });
    expect(calls[0]?.url).toBe(`https://api.coss.com/v1/logs/${log.id}`);
    const missing = await logs.get("log_x/y");
    expect(calls[1]?.url).toBe("https://api.coss.com/v1/logs/log_x%2Fy");
    expect(missing.error?.code).toBe("not_found");
  });
});
