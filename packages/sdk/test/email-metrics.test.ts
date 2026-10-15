/** `coss.email.metrics`: the query it sends, and how the result comes back. */
import { describe, expect, test } from "bun:test";
import { Coss, type EmailMetrics } from "../src/index.ts";
import { apiError, json, mockFetch } from "./helpers.ts";

const API_KEY = "coss_live_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";

const counts = { sent: 2, delivered: 2, bounced: 0, complained: 0, opened: 1, clicked: 0 };

const sampleMetrics: EmailMetrics = {
  object: "email_metrics",
  start: "2026-10-12T00:00:00.000Z",
  end: "2026-10-13T00:00:00.000Z",
  granularity: "day",
  group_by: "mailbox_provider",
  totals: counts,
  series: [
    {
      group: "gmail",
      totals: counts,
      buckets: [{ start: "2026-10-12T00:00:00.000Z", end: "2026-10-13T00:00:00.000Z", ...counts }],
    },
  ],
  has_more: false,
};

function client(...handlers: Parameters<typeof mockFetch>) {
  const { fetch, calls } = mockFetch(...handlers);
  return { coss: new Coss({ apiKey: API_KEY, baseUrl: "https://api.test", fetch }), calls };
}

describe("coss.email.metrics", () => {
  test("sends its filters as query parameters", async () => {
    const { coss, calls } = client(json(200, sampleMetrics));
    const result = await coss.email.metrics({
      from: new Date("2026-10-12T00:00:00Z"),
      group_by: "mailbox_provider",
      category: ["welcome", "receipts"],
      mailbox_provider: "gmail",
      tag: "campaign:spring",
      limit: 5,
    });
    expect(result).toEqual({ data: sampleMetrics, error: null });
    const url = new URL(calls[0]?.url ?? "");
    expect(calls[0]?.method).toBe("GET");
    expect(url.pathname).toBe("/v1/emails/metrics");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      from: "2026-10-12T00:00:00.000Z",
      group_by: "mailbox_provider",
      category: "welcome,receipts",
      mailbox_provider: "gmail",
      tag: "campaign:spring",
      limit: "5",
    });
  });

  test("without parameters, and errors come back as values", async () => {
    const { coss, calls } = client(
      apiError(422, { type: "invalid_request_error", code: "invalid_range", message: "Too long." }),
    );
    const result = await coss.email.metrics();
    expect(calls[0]?.url).toBe("https://api.test/v1/emails/metrics");
    expect(result.data).toBeNull();
    expect(result.error?.code).toBe("invalid_range");
  });
});
