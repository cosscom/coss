/** `coss.email.received` and `coss.domains.receiving`: request shape, bytes and errors. */
import { describe, expect, test } from "bun:test";
import { Coss, type ReceivedEmailSummary } from "../src/index.ts";
import { apiError, json, mockFetch, sampleDomain } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";

function client(...handlers: Parameters<typeof mockFetch>) {
  const { fetch, calls } = mockFetch(...handlers);
  return {
    coss: new Coss({ apiKey: API_KEY, baseUrl: "https://api.test", fetch, maxRetries: 0 }),
    calls,
  };
}

const summary: ReceivedEmailSummary = {
  object: "received_email",
  id: "rcvd_01k5f9yq8re8vb6q2wmz0tb2xd",
  status: "received",
  blocked_reason: null,
  mail_from: "jane@example.com",
  recipients: ["support@abc.inbound.coss.com"],
  from: "Jane <jane@example.com>",
  to: ["support@abc.inbound.coss.com"],
  cc: [],
  subject: "Hi",
  message_id: "<m@example.com>",
  attachments: [],
  size: 120,
  spam: false,
  verdicts: { spam: "pass", virus: "pass", spf: null, dkim: null, dmarc: null, dmarc_policy: null },
  sandbox: false,
  received_at: "2026-10-09T12:00:00.000Z",
};

describe("coss.email.received", () => {
  test("list, get, address and delete hit the documented routes", async () => {
    const { coss, calls } = client(json(200, { object: "list", data: [summary], has_more: false }));
    const list = await coss.email.received.list({ limit: 5, after: "rcvd_x" });
    await coss.email.received.get(summary.id);
    await coss.email.received.address();
    await coss.email.received.delete(summary.id);
    expect(list.data?.data).toEqual([summary]);
    expect(
      calls.map(
        (call) => `${call.method} ${new URL(call.url).pathname}${new URL(call.url).search}`,
      ),
    ).toEqual([
      "GET /v1/received_emails?limit=5&after=rcvd_x",
      `GET /v1/received_emails/${summary.id}`,
      "GET /v1/received_emails/address",
      `DELETE /v1/received_emails/${summary.id}`,
    ]);
  });

  test("getRaw and getAttachment return the bytes as they are", async () => {
    const bytes = new Uint8Array([0x46, 0x72, 0xff, 0x00, 0x0a]);
    const { coss, calls } = client(
      () => new Response(bytes, { status: 200, headers: { "Content-Type": "message/rfc822" } }),
    );
    const raw = await coss.email.received.getRaw(summary.id);
    const file = await coss.email.received.getAttachment(summary.id, "rcvdatt_1");
    expect(raw).toEqual({ data: bytes, error: null });
    expect(file.data).toEqual(bytes);
    expect(calls[0]?.headers.get("accept")).toBe("*/*");
    expect(new URL(calls[1]?.url ?? "").pathname).toBe(
      `/v1/received_emails/${summary.id}/attachments/rcvdatt_1`,
    );
  });

  test("a bytes request still returns the API's error", async () => {
    const { coss } = client(apiError(404, { type: "not_found_error", code: "not_found" }));
    const result = await coss.email.received.getRaw("rcvd_missing");
    expect(result.data).toBeNull();
    expect(result.error).toMatchObject({ type: "not_found_error", code: "not_found", status: 404 });
  });
});

describe("coss.domains.receiving", () => {
  test("create posts the hostname; delete removes it", async () => {
    const { coss, calls } = client(json(200, sampleDomain));
    await coss.domains.receiving.create(sampleDomain.id, { hostname: "inbound.acme.com" });
    await coss.domains.receiving.delete(sampleDomain.id);
    expect(calls.map((call) => `${call.method} ${new URL(call.url).pathname}`)).toEqual([
      `POST /v1/domains/${sampleDomain.id}/receiving`,
      `DELETE /v1/domains/${sampleDomain.id}/receiving`,
    ]);
    expect(calls[0]?.body).toBe('{"hostname":"inbound.acme.com"}');
  });
});
