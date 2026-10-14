/** The billing resources: request shapes, and how results come back. */
import { describe, expect, test } from "bun:test";
import { Coss, type Invoice, type Usage } from "../src/index.ts";
import { apiError, json, mockFetch } from "./helpers.ts";

const API_KEY = "coss_live_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";

const sampleUsage: Usage = {
  object: "usage",
  meter: "email.recipients",
  dimension: null,
  environment_id: "env_01k7c8m4q2f3e9v6t5r1n0p8yz",
  start: "2026-10-12T00:00:00.000Z",
  end: "2026-10-13T00:00:00.000Z",
  quantity: 4200,
};

const sampleInvoice: Invoice = {
  object: "invoice",
  id: "inv_01k7c8m4q2f3e9v6t5r1n0p8yz",
  number: "COSS-000042",
  kind: "period",
  status: "paid",
  currency: "usd",
  period: { start: "2026-10-01T00:00:00.000Z", end: "2026-11-01T00:00:00.000Z" },
  subtotal: 7300,
  discount: 0,
  credit: 2500,
  tax: 0,
  total: 4800,
  amount_paid: 4800,
  amount_due: 0,
  collection_method: "charge_automatically",
  due_at: "2026-11-01T00:20:00.000Z",
  finalized_at: "2026-11-01T00:20:00.000Z",
  paid_at: "2026-11-01T00:21:00.000Z",
  voided_at: null,
  hosted_url: null,
  pdf_url: null,
  lines: [],
};

function client(...handlers: Parameters<typeof mockFetch>) {
  const { fetch, calls } = mockFetch(...handlers);
  return { coss: new Coss({ apiKey: API_KEY, baseUrl: "https://api.test", fetch }), calls };
}

describe("coss.billing", () => {
  test("get reads the organization's billing", async () => {
    const { coss, calls } = client(json(200, { object: "billing" }));
    await coss.billing.get();
    expect(calls[0]).toMatchObject({ method: "GET", url: "https://api.test/v1/billing" });
  });

  test("usage sends its filters as query parameters", async () => {
    const { coss, calls } = client(
      json(200, { object: "list", data: [sampleUsage], has_more: false }),
    );
    const result = await coss.billing.usage({
      from: "2026-10-01T00:00:00Z",
      granularity: "day",
      group_by: "environment",
      meter: "email.recipients",
    });
    expect(result.data?.data).toEqual([sampleUsage]);
    const url = new URL(calls[0]?.url ?? "");
    expect(url.pathname).toBe("/v1/billing/usage");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      from: "2026-10-01T00:00:00Z",
      granularity: "day",
      group_by: "environment",
      meter: "email.recipients",
    });
  });

  test("invoices and credits page with `after`", async () => {
    const { coss, calls } = client(
      json(200, { object: "list", data: [], has_more: false }),
      json(200, sampleInvoice),
      json(200, { object: "list", data: [], has_more: false }),
    );
    await coss.billing.invoices.list({ status: "paid", after: sampleInvoice.id, limit: 10 });
    expect(await coss.billing.invoices.get("inv_a/b")).toEqual({
      data: sampleInvoice,
      error: null,
    });
    await coss.billing.credits.list({ status: "all" });
    expect(calls.map((call) => call.url)).toEqual([
      `https://api.test/v1/billing/invoices?status=paid&after=${sampleInvoice.id}&limit=10`,
      "https://api.test/v1/billing/invoices/inv_a%2Fb",
      "https://api.test/v1/billing/credits?status=all",
    ]);
  });

  test("errors come back, never thrown", async () => {
    const { coss } = client(apiError(404, { type: "not_found_error", code: "not_found" }));
    const result = await coss.billing.invoices.get("inv_missing");
    expect(result.error).toMatchObject({ type: "not_found_error", status: 404 });
  });
});
