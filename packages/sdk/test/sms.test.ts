import { describe, expect, test } from "bun:test";
import { Coss, type List, type Sms, type SmsNumber, type SmsSuppression } from "../src/index.ts";
import { json, mockFetch } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";
const BASE = "https://api.coss.com/v1/sms";

const sms: Sms = {
  object: "sms",
  id: "sms_01k5f9yq8re8vb6q2wmz0tb2xd",
  from: "+14155550123",
  to: "+14155550199",
  body: "Your code is 123456",
  status: "queued",
  segments: 1,
  encoding: "gsm7",
  country: "US",
  tags: [],
  failure: null,
  sandbox: true,
  scheduled_at: null,
  sent_at: null,
  delivered_at: null,
  created_at: "2026-11-10T12:00:00.000Z",
};

function client(...handlers: Parameters<typeof mockFetch>) {
  const { fetch, calls } = mockFetch(...handlers);
  return { coss: new Coss({ apiKey: API_KEY, fetch }), calls };
}

describe("coss.sms", () => {
  test("send POSTs the message with an idempotency key", async () => {
    const { coss, calls } = client(json(202, sms));
    const result = await coss.sms.send({
      from: "+14155550123",
      to: "+14155550199",
      body: "Your code is 123456",
    });
    expect(result).toEqual({ data: sms, error: null });
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url).toBe(BASE);
    expect(calls[0]?.headers.get("idempotency-key")).toBeTruthy();
  });

  test("list joins statuses; get, events and cancel use the id", async () => {
    const page: List<Sms> = { object: "list", data: [sms], has_more: false };
    const { coss, calls } = client(json(200, page), json(200, sms));
    await coss.sms.list({ status: ["failed", "undelivered"], limit: 5 });
    expect(calls[0]?.url).toBe(`${BASE}?status=failed%2Cundelivered&limit=5`);
    await coss.sms.get(sms.id);
    expect(calls[1]?.url).toBe(`${BASE}/${sms.id}`);
    await coss.sms.listEvents(sms.id);
    expect(calls[2]?.url).toBe(`${BASE}/${sms.id}/events`);
    await coss.sms.cancel(sms.id);
    expect(calls[3]).toMatchObject({ method: "POST", url: `${BASE}/${sms.id}/cancel` });
  });

  test("suppressions, received messages and numbers", async () => {
    const entry: SmsSuppression = {
      object: "sms_suppression",
      id: "smssup_01k5f9yq8re8vb6q2wmz0tb2xd",
      phone_number: "+14155550199",
      reason: "opt_out",
      sms_id: null,
      created_at: "2026-11-10T12:00:00.000Z",
    };
    const numbers: List<SmsNumber> = { object: "list", data: [], has_more: false };
    const { coss, calls } = client(json(201, entry), json(200, numbers));
    await coss.sms.suppressions.add({ phone_number: "+14155550199" });
    expect(calls[0]).toMatchObject({ method: "POST", url: `${BASE}/suppressions` });
    await coss.sms.suppressions.check({ phone_number: "+14155550199" });
    expect(calls[1]?.url).toBe(`${BASE}/suppressions/check?phone_number=%2B14155550199`);
    await coss.sms.suppressions.remove(entry.id);
    expect(calls[2]).toMatchObject({ method: "DELETE", url: `${BASE}/suppressions/${entry.id}` });
    await coss.sms.received.list({ from: "+14155550199" });
    expect(calls[3]?.url).toBe(`${BASE}/received?from=%2B14155550199`);
    await coss.sms.numbers.list();
    expect(calls[4]?.url).toBe(`${BASE}/numbers`);
  });
});
