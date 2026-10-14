import { beforeEach, expect, mock, spyOn, test } from "bun:test";
import { createHmac } from "node:crypto";
import { StripeBillingProvider } from "@coss/billing/stripe";

const SECRET = "whsec_test_secret";
const stripe = new StripeBillingProvider({ secretKey: "sk_test_fake", webhookSecret: SECRET });
let configured = true;
const stored: { provider: string; id: string; type: string }[] = [];

mock.module("@/lib/billing", () => ({
  billingRuntime: () => ({ stripe: configured ? stripe : null }),
}));
mock.module("@coss/billing", () => ({
  BillingError: class extends Error {},
  storeProviderEvent: async (provider: string, event: { id: string; type: string }) => {
    stored.push({ provider, id: event.id, type: event.type });
    return true;
  },
}));

const { POST } = await import("../src/app/api/billing/webhook/route");
const { rateLimitRuntime } = await import("../src/lib/rate-limit-runtime");

function signed(payload: string, secret = SECRET): Request {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return new Request("https://coss.com/api/billing/webhook", {
    method: "POST",
    headers: {
      "stripe-signature": `t=${timestamp},v1=${signature}`,
      "content-type": "application/json",
    },
    body: payload,
  });
}

const event = JSON.stringify({
  id: "evt_1",
  object: "event",
  type: "invoice.paid",
  data: { object: { id: "in_1", object: "invoice" } },
});

beforeEach(() => {
  configured = true;
  stored.length = 0;
});

test("a signed event is stored and acknowledged", async () => {
  const response = await POST(signed(event));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ received: true });
  expect(stored).toEqual([{ provider: "stripe", id: "evt_1", type: "invoice.paid" }]);
});

test("a bad or missing signature is refused before anything is stored", async () => {
  expect((await POST(signed(event, "whsec_other"))).status).toBe(400);
  const unsigned = new Request("https://coss.com/api/billing/webhook", {
    method: "POST",
    body: event,
  });
  expect((await POST(unsigned)).status).toBe(400);
  expect(stored).toEqual([]);
});

test("oversized bodies, rate limits and an unconfigured Stripe", async () => {
  const big = new Request("https://coss.com/api/billing/webhook", {
    method: "POST",
    headers: { "stripe-signature": "t=1,v1=00" },
    body: "x".repeat(1024 * 1024 + 1),
  });
  expect((await POST(big)).status).toBe(413);
  const consume = spyOn(rateLimitRuntime().limiter, "consume").mockResolvedValueOnce({
    allowed: false,
    retryAfterMs: 2_000,
  } as Awaited<ReturnType<ReturnType<typeof rateLimitRuntime>["limiter"]["consume"]>>);
  const limited = await POST(signed(event));
  consume.mockRestore();
  expect(limited.status).toBe(429);
  expect(limited.headers.get("Retry-After")).toBe("2");
  configured = false;
  expect((await POST(signed(event))).status).toBe(404);
  expect(stored).toEqual([]);
});
