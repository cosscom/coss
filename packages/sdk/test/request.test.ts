import { describe, expect, test } from "bun:test";
import { API_VERSION, Coss } from "../src/index.ts";
import { apiError, json, mockFetch } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";
const BASE_URL = "https://api.coss.test";
// Retry-After: 0 keeps retries instant.
const unavailable = apiError(
  503,
  { type: "api_error", code: "service_unavailable" },
  { "Retry-After": "0" },
);

function client(fetch: ReturnType<typeof mockFetch>["fetch"]): Coss {
  return new Coss({ apiKey: API_KEY, baseUrl: BASE_URL, fetch, maxRetries: 2 });
}

describe("coss.request", () => {
  test("GET: the path's query merged with `query`, lists comma-joined", async () => {
    const { fetch, calls } = mockFetch(json(200, { object: "list", data: [], has_more: false }));
    const { data, error } = await client(fetch).request("GET", "/v1/logs?limit=5", {
      query: { source: ["api", "email"], from: new Date("2026-10-01T00:00:00Z"), q: undefined },
    });
    expect(error).toBeNull();
    expect(data).toEqual({ object: "list", data: [], has_more: false });
    const url = new URL(calls[0]?.url ?? "");
    expect(`${url.origin}${url.pathname}`).toBe(`${BASE_URL}/v1/logs`);
    expect([...url.searchParams]).toEqual([
      ["limit", "5"],
      ["source", "api,email"],
      ["from", "2026-10-01T00:00:00.000Z"],
    ]);
    expect(calls[0]?.headers.get("authorization")).toBe(`Bearer ${API_KEY}`);
    expect(calls[0]?.headers.get("coss-version")).toBe(API_VERSION);
    expect(calls[0]?.headers.has("idempotency-key")).toBe(false);
  });

  test("PUT and PATCH aren't retried unless asked (a draft save counts every attempt)", async () => {
    for (const method of ["PUT", "PATCH"] as const) {
      const { fetch, calls } = mockFetch(unavailable, json(200, {}));
      const { error } = await client(fetch).request(method, "/v1/email_templates/etpl_1/draft", {
        body: {},
      });
      expect(error?.code).toBe("service_unavailable");
      expect(calls).toHaveLength(1);
    }
  });

  test("POST: a JSON body with an Idempotency-Key, not retried unless asked", async () => {
    const once = mockFetch(unavailable);
    const { error } = await client(once.fetch).request("POST", "/v1/domains", {
      body: { name: "acme.test" },
      idempotencyKey: "key-1",
    });
    expect(error?.code).toBe("service_unavailable");
    expect(once.calls).toHaveLength(1);
    expect(once.calls[0]?.method).toBe("POST");
    expect(once.calls[0]?.body).toBe(JSON.stringify({ name: "acme.test" }));
    expect(once.calls[0]?.headers.get("content-type")).toBe("application/json");
    expect(once.calls[0]?.headers.get("idempotency-key")).toBe("key-1");

    const retried = mockFetch(unavailable, json(200, { object: "domain" }));
    const result = await client(retried.fetch).request("POST", "/v1/domains", {
      body: {},
      retry: true,
    });
    expect(result.data).toEqual({ object: "domain" });
    expect(retried.calls).toHaveLength(2);
    // One logical request: the same key on every attempt.
    expect(retried.calls[1]?.headers.get("idempotency-key")).toBe(
      retried.calls[0]?.headers.get("idempotency-key") ?? "",
    );
  });

  test("GET and DELETE are retried like every read", async () => {
    for (const method of ["GET", "DELETE"] as const) {
      const { fetch, calls } = mockFetch(unavailable, json(200, { deleted: true }));
      const { data } = await client(fetch).request(method, "/v1/webhook_endpoints/we_1");
      expect(data).toEqual({ deleted: true });
      expect(calls).toHaveLength(2);
    }
  });

  test("a body that isn't JSON, as text or bytes", async () => {
    const csv = () =>
      new Response("email\na@example.com\n", { headers: { "content-type": "text/csv" } });
    const text = await client(mockFetch(csv).fetch).request<string>("GET", "/v1/contacts/export", {
      responseType: "text",
    });
    expect(text.data).toBe("email\na@example.com\n");
    const bytes = await client(mockFetch(csv).fetch).request<Uint8Array>("GET", "/v1/x", {
      responseType: "bytes",
    });
    expect(new TextDecoder().decode(bytes.data ?? new Uint8Array())).toBe("email\na@example.com\n");
  });

  test("refuses a path that isn't one, without a request", async () => {
    const { fetch, calls } = mockFetch(json(200, {}));
    for (const path of ["v1/domains", "@evil.test/v1/domains", "https://evil.test/v1/domains"]) {
      const { data, error } = await client(fetch).request("GET", path);
      expect(data).toBeNull();
      expect(error).toMatchObject({ type: "invalid_request_error", code: "invalid_path" });
    }
    expect(calls).toHaveLength(0);
  });
});
