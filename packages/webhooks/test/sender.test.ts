import { describe, expect, test } from "bun:test";
import { isBlockedAddress } from "../src/addresses.ts";
import { decryptSecret, encryptSecret, parseSecretsKey } from "../src/secrets.ts";
import {
  createWebhookSender,
  RESPONSE_EXCERPT_BYTES,
  validateWebhookUrl,
  WebhookUrlError,
} from "../src/sender.ts";
import { generateSigningSecret, signPayload } from "../src/signing.ts";
import { TEST_SECRETS_KEY, webhookReceiver } from "../src/testing.ts";

describe("isBlockedAddress", () => {
  test.each([
    "0.0.0.0",
    "10.1.2.3",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "198.18.0.1",
    "224.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "::ffff:10.0.0.1",
    "::ffff:7f00:1",
    "64:ff9b::a00:1",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "ff02::1",
    "2001:db8::1",
    "not-an-ip",
  ])("blocks %s", (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  test.each([
    "1.1.1.1",
    "8.8.8.8",
    "172.32.0.1",
    "100.128.0.1",
    "2606:4700:4700::1111",
    "::ffff:8.8.8.8",
  ])("allows %s", (address) => {
    expect(isBlockedAddress(address)).toBe(false);
  });
});

describe("signing", () => {
  test("matches the Standard Webhooks reference vector", () => {
    expect(
      signPayload({
        secret: "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw",
        id: "msg_p5jXN8AQM9LWM0D4loKWxJek",
        timestamp: 1614265330,
        body: '{"test": 2432232314}',
      }),
    ).toBe("v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=");
  });

  test("secrets are whsec_ + 32 random bytes", () => {
    const secret = generateSigningSecret();
    expect(secret).toStartWith("whsec_");
    expect(Buffer.from(secret.slice(6), "base64")).toHaveLength(32);
    expect(generateSigningSecret()).not.toBe(secret);
  });
});

describe("secret encryption", () => {
  test("round-trips and detects tampering", () => {
    const stored = encryptSecret("whsec_abc", TEST_SECRETS_KEY);
    expect(stored).toStartWith("v1:");
    expect(decryptSecret(stored, TEST_SECRETS_KEY)).toBe("whsec_abc");
    expect(() => decryptSecret(stored, Buffer.alloc(32, 1))).toThrow();
    const [version, iv, , tag] = stored.split(":");
    const forged = [version, iv, Buffer.from("whsec_xyz").toString("base64"), tag].join(":");
    expect(() => decryptSecret(forged, TEST_SECRETS_KEY)).toThrow();
  });

  test("the key must be 32 bytes", () => {
    expect(parseSecretsKey(Buffer.alloc(32).toString("base64"))).toHaveLength(32);
    expect(() => parseSecretsKey("short")).toThrow("32 bytes");
  });
});

describe("validateWebhookUrl", () => {
  test.each([
    ["not a url", "full URL"],
    ["http://example.com/hook", "https://"],
    ["ftp://example.com/hook", "https://"],
    ["https://user:pass@example.com/hook", "username"],
    ["https://localhost/hook", "public"],
    ["https://127.0.0.1/hook", "public"],
    ["https://[::1]/hook", "public"],
    ["https://169.254.169.254/latest/meta-data", "public"],
  ])("rejects %s", (url, message) => {
    expect(() => validateWebhookUrl(url, { allowInsecure: false })).toThrow(message);
  });

  test("accepts public https URLs, and local http ones in development", () => {
    expect(validateWebhookUrl("https://example.com/hook?x=1", { allowInsecure: false }).href).toBe(
      "https://example.com/hook?x=1",
    );
    expect(validateWebhookUrl("http://localhost:4000/hook", { allowInsecure: true }).href).toBe(
      "http://localhost:4000/hook",
    );
  });
});

describe("createWebhookSender", () => {
  const request = (url: string) => ({ url, headers: { "x-test": "1" }, body: '{"ok":true}' });

  test("posts the body with the given headers", async () => {
    const receiver = webhookReceiver();
    try {
      const send = createWebhookSender({ allowPrivateNetworks: true });
      const response = await send(request(receiver.url));
      expect(response).toEqual({ status: 200, body: "ok" });
      expect(receiver.received[0]?.body).toBe('{"ok":true}');
      expect(receiver.received[0]?.headers.get("x-test")).toBe("1");
      expect(receiver.received[0]?.headers.get("content-type")).toBe("application/json");
    } finally {
      receiver.stop();
    }
  });

  test.each([
    ["127.0.0.1", 4],
    ["::ffff:10.0.0.1", 6],
    ["169.254.169.254", 4],
  ])("refuses hosts resolving to %s, even if DNS later changes", async (address, family) => {
    const receiver = webhookReceiver();
    try {
      const send = createWebhookSender({ resolve: async () => [{ address, family }] });
      const port = new URL(receiver.url).port;
      await expect(send(request(`http://hooks.example.com:${port}/x`))).rejects.toThrow(
        WebhookUrlError,
      );
      expect(receiver.received).toHaveLength(0);
    } finally {
      receiver.stop();
    }
  });

  test("refuses private IP literals", async () => {
    const send = createWebhookSender();
    await expect(send(request("http://10.0.0.1/x"))).rejects.toThrow(WebhookUrlError);
  });

  test("does not follow redirects and truncates long responses", async () => {
    const receiver = webhookReceiver((req) =>
      new URL(req.url).searchParams.has("redirect")
        ? Response.redirect("http://127.0.0.1:1/elsewhere", 302)
        : new Response("x".repeat(10_000), { status: 500 }),
    );
    try {
      const send = createWebhookSender({ allowPrivateNetworks: true });
      expect((await send(request(`${receiver.url}?redirect`))).status).toBe(302);
      const long = await send(request(receiver.url));
      expect(long.status).toBe(500);
      expect(long.body).toHaveLength(RESPONSE_EXCERPT_BYTES);
      expect(receiver.received).toHaveLength(2);
    } finally {
      receiver.stop();
    }
  });

  test("gives up on slow endpoints", async () => {
    const receiver = webhookReceiver(async () => {
      await Bun.sleep(1000);
      return new Response("late");
    });
    try {
      const send = createWebhookSender({ allowPrivateNetworks: true });
      await expect(send({ ...request(receiver.url), timeoutMs: 100 })).rejects.toThrow("Timed out");
    } finally {
      receiver.stop();
    }
  });
});
