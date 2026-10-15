import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { generateKeyPairSync, verify } from "node:crypto";
import { createServer, type Http2Server, type IncomingHttpHeaders } from "node:http2";
import type { AddressInfo } from "node:net";
import { apnsJwt, createApnsSender } from "../src/apns.ts";
import type { PushMessage } from "../src/send.ts";

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const PEM = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

type Received = { headers: IncomingHttpHeaders; body: string };
const received: Received[] = [];
/** The answer for a device token: [status, reason]. */
const answers = new Map<string, [number, string?]>();
let server: Http2Server;
let origin: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      body += chunk;
    });
    req.on("end", () => {
      received.push({ headers: req.headers, body });
      const token = String(req.headers[":path"]).split("/").pop() ?? "";
      const [status, reason] = answers.get(token) ?? [200];
      res.writeHead(status, { "content-type": "application/json" });
      res.end(reason ? JSON.stringify({ reason }) : "");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

const message: PushMessage = {
  id: "pushntf_test",
  title: "Webhook endpoint disabled",
  body: "Orders in Default / Production was disabled after failing for 5 days.",
  path: "/acme/projects/default/production/webhooks/whep_1",
  collapseId: "pushntf_test",
  expiresAt: new Date("2026-10-16T00:00:00Z"),
};

function sender(now = () => Date.now()) {
  return createApnsSender({
    keyId: "ABC123DEFG",
    teamId: "TEAM123456",
    privateKey: PEM,
    topic: "com.coss.ios",
    origins: { production: origin, sandbox: origin },
    now,
  });
}

function decode(part: string | undefined): Record<string, unknown> {
  return JSON.parse(Buffer.from(part ?? "", "base64url").toString());
}

describe("APNs", () => {
  test("the provider token is an ES256 JWT the key's public half verifies", () => {
    const jwt = apnsJwt({ keyId: "KEY", teamId: "TEAM", key: privateKey, now: 1_700_000_000_000 });
    const [header, claims, signature] = jwt.split(".");
    expect(decode(header)).toEqual({ alg: "ES256", kid: "KEY" });
    expect(decode(claims)).toEqual({ iss: "TEAM", iat: 1_700_000_000 });
    const valid = verify(
      "sha256",
      Buffer.from(`${header}.${claims}`),
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(signature ?? "", "base64url"),
    );
    expect(valid).toBe(true);
  });

  test("posts an alert over HTTP/2 and reuses the token", async () => {
    received.length = 0;
    const apns = sender();
    const target = {
      deviceId: "pushdev_1",
      token: "a".repeat(64),
      apnsEnvironment: "sandbox" as const,
    };
    expect(await apns.send(target, message)).toEqual({ status: "delivered" });
    expect(await apns.send(target, message)).toEqual({ status: "delivered" });
    apns.close();

    const [first, second] = received;
    expect(first?.headers[":method"]).toBe("POST");
    expect(first?.headers[":path"]).toBe(`/3/device/${"a".repeat(64)}`);
    expect(first?.headers["apns-topic"]).toBe("com.coss.ios");
    expect(first?.headers["apns-push-type"]).toBe("alert");
    expect(first?.headers["apns-collapse-id"]).toBe("pushntf_test");
    expect(first?.headers["apns-expiration"]).toBe(
      String(Date.parse("2026-10-16T00:00:00Z") / 1000),
    );
    expect(String(first?.headers.authorization)).toStartWith("bearer ");
    expect(second?.headers.authorization).toBe(first?.headers.authorization);
    expect(JSON.parse(first?.body ?? "")).toEqual({
      aps: { alert: { title: message.title, body: message.body }, sound: "default" },
      body: { path: message.path },
    });
  });

  test("maps Apple's answers", async () => {
    const apns = sender();
    const target = (token: string) => ({
      deviceId: "pushdev_1",
      token,
      apnsEnvironment: "production" as const,
    });
    answers.set("b".repeat(64), [410, "Unregistered"]);
    answers.set("c".repeat(64), [400, "BadDeviceToken"]);
    answers.set("d".repeat(64), [429, "TooManyRequests"]);
    answers.set("e".repeat(64), [503]);
    expect(await apns.send(target("b".repeat(64)), message)).toEqual({
      status: "invalid_token",
      reason: "Unregistered",
    });
    expect(await apns.send(target("c".repeat(64)), message)).toEqual({
      status: "invalid_token",
      reason: "BadDeviceToken",
    });
    expect(await apns.send(target("d".repeat(64)), message)).toEqual({
      status: "retry",
      reason: "TooManyRequests",
    });
    expect(await apns.send(target("e".repeat(64)), message)).toEqual({
      status: "retry",
      reason: "HTTP 503",
    });
    apns.close();
  });

  test("an expired provider token is signed again", async () => {
    received.length = 0;
    let now = 1_700_000_000_000;
    const apns = sender(() => now);
    const target = {
      deviceId: "pushdev_1",
      token: "f".repeat(64),
      apnsEnvironment: "sandbox" as const,
    };
    answers.set("f".repeat(64), [403, "ExpiredProviderToken"]);
    expect(await apns.send(target, message)).toEqual({
      status: "retry",
      reason: "ExpiredProviderToken",
    });
    now += 1000;
    answers.delete("f".repeat(64));
    expect(await apns.send(target, message)).toEqual({ status: "delivered" });
    apns.close();
    expect(received[1]?.headers.authorization).not.toBe(received[0]?.headers.authorization);
  });

  test("an unreachable gateway is a retry, not a throw", async () => {
    const apns = createApnsSender({
      keyId: "ABC123DEFG",
      teamId: "TEAM123456",
      privateKey: PEM,
      topic: "com.coss.ios",
      origins: { production: "http://127.0.0.1:1", sandbox: "http://127.0.0.1:1" },
    });
    const result = await apns.send(
      { deviceId: "pushdev_1", token: "a".repeat(64), apnsEnvironment: "production" },
      message,
    );
    expect(result.status).toBe("retry");
    apns.close();
  });
});
