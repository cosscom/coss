/**
 * Delivers webhook requests without letting customer URLs reach internal networks (SSRF): every
 * address the host resolves to must be public, and the connection is pinned to the checked
 * address, so DNS can't change the answer between the check and the connect (rebinding).
 * Redirects are never followed and only the first 1 KB of the response is read.
 */
import { lookup as dnsLookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import type { LookupFunction } from "node:net";
import { isIP } from "node:net";
import { isBlockedAddress } from "./addresses.ts";

export const RESPONSE_EXCERPT_BYTES = 1024;
export const DEFAULT_TIMEOUT_MS = 10_000;

export type WebhookRequest = {
  url: string;
  headers: Record<string, string>;
  body: string;
  timeoutMs?: number;
  /** Default `application/json` (log drains send their format's, e.g. `application/x-ndjson`). */
  contentType?: string;
  /** Default `COSS-Webhooks/1.0`. */
  userAgent?: string;
};

export type WebhookResponse = { status: number; body: string };

/** Sends one request; resolves with any HTTP response, rejects on network-level failures. */
export type WebhookSender = (request: WebhookRequest) => Promise<WebhookResponse>;

export type ResolvedAddress = { address: string; family: number };

export type SenderOptions = {
  /** Allow loopback/private targets (local development and tests only). */
  allowPrivateNetworks?: boolean;
  resolve?: (hostname: string) => Promise<ResolvedAddress[]>;
};

export class WebhookUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookUrlError";
  }
}

const defaultResolve = (hostname: string): Promise<ResolvedAddress[]> =>
  dnsLookup(hostname, { all: true, verbatim: true });

/**
 * Checks a URL before it is saved. `allowInsecure` permits `http:` and private hosts (local
 * development only). Addresses are checked again on every delivery.
 */
export function validateWebhookUrl(value: string, opts: { allowInsecure: boolean }): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new WebhookUrlError("Enter a full URL, like https://example.com/webhooks/coss.");
  }
  if (url.protocol !== "https:" && !(opts.allowInsecure && url.protocol === "http:")) {
    throw new WebhookUrlError("Webhook URLs must use https://.");
  }
  if (url.username || url.password) {
    throw new WebhookUrlError("Webhook URLs can't contain a username or password.");
  }
  if (url.href.length > 2048)
    throw new WebhookUrlError("Webhook URLs can be at most 2048 characters.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!opts.allowInsecure && (host === "localhost" || (isIP(host) && isBlockedAddress(host)))) {
    throw new WebhookUrlError("Webhook URLs must point at a public address.");
  }
  return url;
}

/**
 * A `lookup` for `http(s).request` that resolves the host, refuses it when any answer is private,
 * and hands the socket the address that was checked (so DNS can't rebind in between). Shared with
 * other fetches of customer-controlled hosts (Domain Connect discovery in `@coss/email`).
 */
export function publicAddressLookup(opts: SenderOptions = {}): LookupFunction {
  const resolve = opts.resolve ?? defaultResolve;
  return (hostname, options, callback) => {
    resolve(hostname).then(
      (addresses) => {
        const blocked = addresses.find((entry) => isBlockedAddress(entry.address));
        const first = addresses[0];
        if (!first) {
          callback(
            Object.assign(new Error(`${hostname} has no addresses`), { code: "ENOTFOUND" }),
            "",
            0,
          );
        } else if (blocked && !opts.allowPrivateNetworks) {
          callback(new WebhookUrlError(`${hostname} resolves to a non-public address.`), "", 0);
        } else if (options.all) {
          (callback as unknown as (err: null, all: ResolvedAddress[]) => void)(null, [first]);
        } else {
          callback(null, first.address, first.family);
        }
      },
      (error: Error) => callback(error as NodeJS.ErrnoException, "", 0),
    );
  };
}

export function createWebhookSender(opts: SenderOptions = {}): WebhookSender {
  const lookup = publicAddressLookup(opts);

  return (request) =>
    new Promise<WebhookResponse>((resolvePromise, reject) => {
      const url = new URL(request.url);
      const host = url.hostname.replace(/^\[|\]$/g, "");
      // IP literals skip `lookup`, so check them here.
      if (isIP(host) && isBlockedAddress(host) && !opts.allowPrivateNetworks) {
        reject(new WebhookUrlError(`${host} is not a public address.`));
        return;
      }
      const transport = url.protocol === "https:" ? https : http;
      const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const req = transport.request(
        url,
        {
          method: "POST",
          headers: {
            ...request.headers,
            "content-type": request.contentType ?? "application/json",
            "content-length": String(Buffer.byteLength(request.body)),
            "user-agent": request.userAgent ?? "COSS-Webhooks/1.0",
          },
          lookup,
          timeout: timeoutMs,
        },
        (res) => {
          const chunks: Buffer[] = [];
          let size = 0;
          const finish = () => {
            res.destroy();
            resolvePromise({
              status: res.statusCode ?? 0,
              body: Buffer.concat(chunks).subarray(0, RESPONSE_EXCERPT_BYTES).toString("utf8"),
            });
          };
          res.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
            size += chunk.length;
            if (size >= RESPONSE_EXCERPT_BYTES) finish();
          });
          res.on("end", finish);
          res.on("error", finish);
        },
      );
      const timer = setTimeout(
        () => req.destroy(new Error(`Timed out after ${timeoutMs} ms`)),
        timeoutMs,
      );
      req.on("timeout", () => req.destroy(new Error(`Timed out after ${timeoutMs} ms`)));
      req.on("error", reject);
      req.on("close", () => clearTimeout(timer));
      req.end(request.body);
    });
}
