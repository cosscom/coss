import { describe, expect, test } from "bun:test";
import { Coss, type TrackingRule, type TrackingSettings } from "../src/index.ts";
import { apiError, json, mockFetch } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";
const BASE = "https://api.coss.com/v1/tracking_settings";

const rule: TrackingRule = {
  object: "tracking_rule",
  id: "etr_01k5f9yq8re8vb6q2wmz0tb2xd",
  category: "marketing",
  opens: true,
  clicks: false,
  created_at: "2026-10-09T12:00:00.000Z",
  updated_at: "2026-10-09T12:00:00.000Z",
};

function client(...handlers: Parameters<typeof mockFetch>) {
  const { fetch, calls } = mockFetch(...handlers);
  return { tracking: new Coss({ apiKey: API_KEY, fetch }).email.tracking, calls };
}

describe("coss.email.tracking", () => {
  test("get GETs the environment's settings", async () => {
    const settings: TrackingSettings = {
      object: "tracking_settings",
      default: null,
      categories: [rule],
    };
    const { tracking, calls } = client(json(200, settings));

    expect(await tracking.get()).toEqual({ data: settings, error: null });
    expect(calls[0]?.method).toBe("GET");
    expect(calls[0]?.url).toBe(BASE);
  });

  test("updateDefault and updateCategory PATCH the given fields", async () => {
    const { tracking, calls } = client(json(200, { ...rule, category: null }), json(200, rule));

    expect((await tracking.updateDefault({ opens: true })).data).toMatchObject({ category: null });
    expect(calls[0]?.method).toBe("PATCH");
    expect(calls[0]?.url).toBe(`${BASE}/default`);
    expect(JSON.parse(calls[0]?.body ?? "")).toEqual({ opens: true });

    expect(await tracking.updateCategory("a/b", { clicks: false })).toEqual({
      data: rule,
      error: null,
    });
    expect(calls[1]?.method).toBe("PATCH");
    expect(calls[1]?.url).toBe(`${BASE}/categories/a%2Fb`);
    expect(JSON.parse(calls[1]?.body ?? "")).toEqual({ clicks: false });
  });

  test("removeDefault and removeCategory DELETE without a body", async () => {
    const deleted = {
      object: "tracking_rule",
      id: rule.id,
      category: null,
      deleted: true,
    } as const;
    const { tracking, calls } = client(
      json(200, deleted),
      json(200, { ...deleted, category: "x" }),
    );

    expect(await tracking.removeDefault()).toEqual({ data: deleted, error: null });
    expect(calls[0]?.method).toBe("DELETE");
    expect(calls[0]?.url).toBe(`${BASE}/default`);
    expect(calls[0]?.body).toBeNull();

    expect((await tracking.removeCategory("marketing")).data?.category).toBe("x");
    expect(calls[1]?.method).toBe("DELETE");
    expect(calls[1]?.url).toBe(`${BASE}/categories/marketing`);
  });

  test("returns API errors instead of throwing", async () => {
    const { tracking } = client(apiError(404, { type: "not_found_error", code: "not_found" }));
    const result = await tracking.removeCategory("marketing");
    expect(result.data).toBeNull();
    expect(result.error).toMatchObject({ type: "not_found_error", code: "not_found", status: 404 });
  });
});
