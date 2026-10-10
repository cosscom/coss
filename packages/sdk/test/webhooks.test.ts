import { describe, expect, test } from "bun:test";
import { verifyWebhook, WebhookVerificationError } from "../src/index.ts";

// The Standard Webhooks reference vector.
const SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
const ID = "msg_p5jXN8AQM9LWM0D4loKWxJek";
const TIMESTAMP = 1614265330;
const PAYLOAD = '{"test": 2432232314}';
const SIGNATURE = "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=";
const NOW = new Date(TIMESTAMP * 1000);

function headers(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    "webhook-id": ID,
    "webhook-timestamp": String(TIMESTAMP),
    "webhook-signature": SIGNATURE,
    ...overrides,
  };
}

async function rejection(promise: Promise<unknown>): Promise<string> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(WebhookVerificationError);
  return (error as Error).message;
}

describe("verifyWebhook", () => {
  test("returns the parsed event for a valid signature", async () => {
    expect(await verifyWebhook(PAYLOAD, headers(), SECRET, { now: NOW })).toEqual({
      test: 2432232314,
    } as never);
  });

  test("accepts Headers objects, Node-style arrays and any of several signatures", async () => {
    const asHeaders = new Headers(headers({ "webhook-signature": `v1,bm9wZQ== ${SIGNATURE}` }));
    await verifyWebhook(PAYLOAD, asHeaders, SECRET, { now: NOW });
    await verifyWebhook(
      PAYLOAD,
      {
        "Webhook-Id": [ID],
        "Webhook-Timestamp": String(TIMESTAMP),
        "Webhook-Signature": SIGNATURE,
      },
      SECRET,
      { now: NOW },
    );
  });

  test("rejects a modified body, another secret or a missing header", async () => {
    expect(await rejection(verifyWebhook(`${PAYLOAD} `, headers(), SECRET, { now: NOW }))).toBe(
      "No webhook signature matches.",
    );
    expect(
      await rejection(
        verifyWebhook(PAYLOAD, headers(), "whsec_AAAAAAAAAAAAAAAAAAAAAAAA", { now: NOW }),
      ),
    ).toBe("No webhook signature matches.");
    expect(
      await rejection(
        verifyWebhook(PAYLOAD, headers({ "webhook-signature": "v2,abc" }), SECRET, { now: NOW }),
      ),
    ).toBe("No webhook signature matches.");
    const { "webhook-id": _, ...withoutId } = headers();
    expect(await rejection(verifyWebhook(PAYLOAD, withoutId, SECRET, { now: NOW }))).toContain(
      "Missing",
    );
  });

  test("rejects old, future and malformed timestamps", async () => {
    const late = new Date((TIMESTAMP + 301) * 1000);
    expect(await rejection(verifyWebhook(PAYLOAD, headers(), SECRET, { now: late }))).toContain(
      "timestamp",
    );
    const early = new Date((TIMESTAMP - 301) * 1000);
    await rejection(verifyWebhook(PAYLOAD, headers(), SECRET, { now: early }));
    await rejection(
      verifyWebhook(PAYLOAD, headers({ "webhook-timestamp": "1e9" }), SECRET, { now: NOW }),
    );
    await verifyWebhook(PAYLOAD, headers(), SECRET, { now: late, toleranceSeconds: 600 });
  });
});
