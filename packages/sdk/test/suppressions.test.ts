import { describe, expect, test } from "bun:test";
import {
  Coss,
  type List,
  type Suppression,
  type SuppressionCheck,
  type SuppressionImport,
} from "../src/index.ts";
import { apiError, json, mockFetch } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";
const BASE = "https://api.coss.com/v1/suppressions";

const suppression: Suppression = {
  object: "suppression",
  id: "sup_01k5f9yq8re8vb6q2wmz0tb2xd",
  address: "jane@example.com",
  scope: "marketing",
  reason: "manual",
  email_id: null,
  subaccount_id: null,
  created_at: "2026-10-09T12:00:00.000Z",
};

function client(...handlers: Parameters<typeof mockFetch>) {
  const { fetch, calls } = mockFetch(...handlers);
  return { suppressions: new Coss({ apiKey: API_KEY, fetch }).email.suppressions, calls };
}

describe("coss.email.suppressions", () => {
  test("add POSTs the params with an idempotency key", async () => {
    const { suppressions, calls } = client(json(201, suppression));
    const result = await suppressions.add({ address: "jane@example.com", scope: "marketing" });

    expect(result).toEqual({ data: suppression, error: null });
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url).toBe(BASE);
    expect(JSON.parse(calls[0]?.body ?? "")).toEqual({
      address: "jane@example.com",
      scope: "marketing",
    });
    expect(calls[0]?.headers.get("idempotency-key")).toBeTruthy();
  });

  test("list sends only the given query parameters", async () => {
    const page: List<Suppression> = { object: "list", data: [suppression], has_more: true };
    const { suppressions, calls } = client(json(200, page));

    expect(
      await suppressions.list({ address: "a+b@example.com", limit: 10, after: undefined }),
    ).toEqual({ data: page, error: null });
    expect(calls[0]?.method).toBe("GET");
    expect(calls[0]?.url).toBe(`${BASE}?address=a%2Bb%40example.com&limit=10`);

    await suppressions.list();
    expect(calls[1]?.url).toBe(BASE);
  });

  test("check GETs /check with the address and category", async () => {
    const check: SuppressionCheck = {
      object: "suppression_check",
      address: "jane@example.com",
      suppressed: true,
      suppressions: [suppression],
    };
    const { suppressions, calls } = client(json(200, check));
    const result = await suppressions.check({ address: "jane@example.com", category: "marketing" });

    expect(result.data).toEqual(check);
    expect(calls[0]?.url).toBe(`${BASE}/check?address=jane%40example.com&category=marketing`);
  });

  test("get and remove encode the id; remove uses DELETE without a body or idempotency key", async () => {
    const deleted = { object: "suppression", id: suppression.id, deleted: true } as const;
    const { suppressions, calls } = client(json(200, suppression), json(200, deleted));

    expect((await suppressions.get("sup_a/b")).data).toEqual(suppression);
    expect(calls[0]?.url).toBe(`${BASE}/sup_a%2Fb`);
    expect(await suppressions.remove("sup_a/b")).toEqual({ data: deleted, error: null });
    expect(calls[1]?.method).toBe("DELETE");
    expect(calls[1]?.url).toBe(`${BASE}/sup_a%2Fb`);
    expect(calls[1]?.body).toBeNull();
    expect(calls[1]?.headers.has("idempotency-key")).toBe(false);
  });

  test("returns API errors instead of throwing", async () => {
    const { suppressions } = client(apiError(404, { type: "not_found_error", code: "not_found" }));
    const result = await suppressions.remove(suppression.id);
    expect(result.data).toBeNull();
    expect(result.error).toMatchObject({ type: "not_found_error", code: "not_found", status: 404 });
  });

  test("import sends 1,000 entries per request and adds the batches up", async () => {
    const batch = (created: number, invalidIndex?: number): SuppressionImport => ({
      object: "suppression_import",
      created,
      existing: 0,
      invalid:
        invalidIndex === undefined ? [] : [{ index: invalidIndex, address: "x", message: "bad" }],
    });
    const { suppressions, calls } = client(
      json(200, batch(1000)),
      json(200, batch(999, 5)),
      json(200, batch(1)),
    );
    const entries = Array.from({ length: 2001 }, (_, i) => ({ address: `u${i}@example.com` }));
    const result = await suppressions.import({ suppressions: entries });

    expect(result).toEqual({
      data: {
        object: "suppression_import",
        created: 2000,
        existing: 0,
        invalid: [{ index: 1005, address: "x", message: "bad" }],
      },
      error: null,
    });
    expect(calls.map((c) => [c.method, c.url])).toEqual([
      ["POST", `${BASE}/import`],
      ["POST", `${BASE}/import`],
      ["POST", `${BASE}/import`],
    ]);
    expect(calls.map((c) => JSON.parse(c.body ?? "").suppressions.length)).toEqual([1000, 1000, 1]);
    expect(JSON.parse(calls[1]?.body ?? "").suppressions[0]).toEqual({
      address: "u1000@example.com",
    });
  });

  test("import stops at the first failed batch and returns its error", async () => {
    const { suppressions, calls } = client(
      apiError(422, { type: "invalid_request_error", code: "validation_error" }),
    );
    const result = await suppressions.import({ suppressions: [] });
    expect(result.error).toMatchObject({ type: "invalid_request_error", status: 422 });
    expect(calls).toHaveLength(1);
  });

  test("export returns the CSV text with the filters as query parameters", async () => {
    const csv = "address,scope,reason,created_at,email_id,id\r\n";
    const { suppressions, calls } = client(
      () => new Response(csv, { status: 200, headers: { "Content-Type": "text/csv" } }),
    );
    expect(await suppressions.export({ scope: "news", reason: "bounce" })).toEqual({
      data: csv,
      error: null,
    });
    expect(calls[0]?.method).toBe("GET");
    expect(calls[0]?.url).toBe(`${BASE}/export?scope=news&reason=bounce`);
    expect(calls[0]?.headers.get("idempotency-key")).toBeNull();
  });
});
