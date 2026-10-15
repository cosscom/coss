/**
 * Apple Push Notification service over HTTP/2 with token-based (`.p8`) authentication.
 * Server-only (`node:http2`); the worker wires it when `APNS_*` is set.
 */
import { createPrivateKey, type KeyObject, sign } from "node:crypto";
import { type ClientHttp2Session, connect } from "node:http2";
import type { PushTarget } from "./recipients.ts";
import type { ApnsEnvironment } from "./schemas.ts";
import type { PushMessage, PushResult, PushSender } from "./send.ts";

export const APNS_ORIGINS: Record<ApnsEnvironment, string> = {
  production: "https://api.push.apple.com",
  sandbox: "https://api.sandbox.push.apple.com",
};
/** Apple refuses tokens older than an hour and throttles ones refreshed more often than 20 min. */
const JWT_TTL_MS = 50 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;
/** Reasons that mean the token will never work for this app again. */
const INVALID_TOKEN_REASONS = new Set(["BadDeviceToken", "DeviceTokenNotForTopic", "Unregistered"]);

export type ApnsConfig = {
  keyId: string;
  teamId: string;
  /** The `.p8` key's PEM contents. */
  privateKey: string;
  /** The app's bundle id. */
  topic: string;
  origins?: Record<ApnsEnvironment, string>;
  timeoutMs?: number;
  now?: () => number;
};

export type ApnsSender = PushSender & { close(): void };

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

/** The provider token: an ES256 JWT naming the key and the team. */
export function apnsJwt(input: { keyId: string; teamId: string; key: KeyObject; now: number }) {
  const header = base64url(JSON.stringify({ alg: "ES256", kid: input.keyId }));
  const claims = base64url(
    JSON.stringify({ iss: input.teamId, iat: Math.floor(input.now / 1000) }),
  );
  const signature = sign("sha256", Buffer.from(`${header}.${claims}`), {
    key: input.key,
    dsaEncoding: "ieee-p1363",
  });
  return `${header}.${claims}.${base64url(signature)}`;
}

export function createApnsSender(config: ApnsConfig): ApnsSender {
  const key = createPrivateKey(config.privateKey);
  const origins = config.origins ?? APNS_ORIGINS;
  const now = config.now ?? Date.now;
  const sessions = new Map<ApnsEnvironment, ClientHttp2Session>();
  let jwt: { value: string; issuedAt: number } | null = null;

  function token(): string {
    const at = now();
    if (!jwt || at - jwt.issuedAt > JWT_TTL_MS) {
      jwt = {
        value: apnsJwt({ keyId: config.keyId, teamId: config.teamId, key, now: at }),
        issuedAt: at,
      };
    }
    return jwt.value;
  }

  function session(environment: ApnsEnvironment): ClientHttp2Session {
    const existing = sessions.get(environment);
    if (existing && !existing.closed && !existing.destroyed) return existing;
    const created = connect(origins[environment]);
    const forget = () => {
      if (sessions.get(environment) === created) sessions.delete(environment);
    };
    created.on("close", forget);
    created.on("goaway", forget);
    created.on("error", (error) => {
      console.error(`[push] APNs ${environment} connection failed:`, error);
      forget();
    });
    // An idle connection must not keep the worker alive at shutdown.
    created.unref();
    sessions.set(environment, created);
    return created;
  }

  function send(target: PushTarget, message: PushMessage): Promise<PushResult> {
    return new Promise<PushResult>((resolve) => {
      let settled = false;
      const done = (result: PushResult) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };
      let request: ReturnType<ClientHttp2Session["request"]>;
      try {
        request = session(target.apnsEnvironment).request({
          ":method": "POST",
          ":path": `/3/device/${target.token}`,
          authorization: `bearer ${token()}`,
          "apns-push-type": "alert",
          "apns-priority": "10",
          "apns-topic": config.topic,
          "apns-expiration": String(Math.floor(message.expiresAt.getTime() / 1000)),
          "apns-collapse-id": message.collapseId,
          "content-type": "application/json",
        });
      } catch (error) {
        done({ status: "retry", reason: error instanceof Error ? error.message : "connect" });
        return;
      }
      request.setTimeout(config.timeoutMs ?? REQUEST_TIMEOUT_MS, () => {
        request.close();
        done({ status: "retry", reason: "timeout" });
      });
      let status = 0;
      let body = "";
      request.setEncoding("utf8");
      request.on("response", (headers) => {
        status = Number(headers[":status"] ?? 0);
      });
      request.on("data", (chunk: string) => {
        body += chunk;
      });
      request.on("end", () => done(resultOf(status, body)));
      request.on("error", (error) => done({ status: "retry", reason: error.message }));
      request.end(
        JSON.stringify({
          aps: { alert: { title: message.title, body: message.body }, sound: "default" },
          // expo-notifications hands the app a remote notification's `body` as its `data`.
          body: { path: message.path },
        }),
      );
    }).then((result) => {
      // Apple says the provider token expired (e.g. after the clock moved): sign a new one.
      if (result.status === "retry" && result.reason === "ExpiredProviderToken") jwt = null;
      return result;
    });
  }

  return {
    send,
    close() {
      for (const created of sessions.values()) created.close();
      sessions.clear();
    },
  };
}

function resultOf(status: number, body: string): PushResult {
  if (status === 200) return { status: "delivered" };
  let reason = `HTTP ${status}`;
  try {
    const parsed = JSON.parse(body) as { reason?: unknown };
    if (typeof parsed.reason === "string") reason = parsed.reason;
  } catch {}
  if (status === 410 || INVALID_TOKEN_REASONS.has(reason))
    return { status: "invalid_token", reason };
  return { status: "retry", reason };
}
