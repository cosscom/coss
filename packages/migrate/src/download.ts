/**
 * Downloads of provider export files (SendGrid's contact exports, at signed storage URLs the
 * provider returns): https only, public addresses only (the socket is pinned to the address that
 * was checked, as for webhook deliveries), no redirects, and capped in size before and after
 * decompression.
 */
import https from "node:https";
import { isIP } from "node:net";
import { gunzipSync } from "node:zlib";
import { isBlockedAddress, publicAddressLookup, type SenderOptions } from "@coss/webhooks";
import type { Downloader } from "./sources/deps.ts";

export const MAX_DOWNLOAD_BYTES = 32 * 1024 * 1024;
export const MAX_UNPACKED_BYTES = 128 * 1024 * 1024;
const TIMEOUT_MS = 60_000;

/** Unzips gzip (recognized by its magic bytes, whatever the file is called); other bytes as they are. */
export function unpack(bytes: Uint8Array): Uint8Array {
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return bytes;
  return gunzipSync(bytes, { maxOutputLength: MAX_UNPACKED_BYTES });
}

export function publicDownloader(opts: SenderOptions = {}): Downloader {
  const lookup = publicAddressLookup(opts);
  return (target) =>
    new Promise((resolve, reject) => {
      const url = new URL(target);
      if (url.protocol !== "https:") {
        reject(new Error("Export URLs must be https."));
        return;
      }
      const host = url.hostname.replace(/^\[|\]$/g, "");
      if (isIP(host) && isBlockedAddress(host) && !opts.allowPrivateNetworks) {
        reject(new Error("Export URLs must be on a public address."));
        return;
      }
      const req = https.request(url, { method: "GET", lookup, timeout: TIMEOUT_MS }, (res) => {
        if ((res.statusCode ?? 0) !== 200) {
          res.resume();
          reject(new Error(`The export download answered ${res.statusCode}.`));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_DOWNLOAD_BYTES) {
            req.destroy(new Error("The export file is too large."));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
        res.on("error", reject);
      });
      const timer = setTimeout(
        () => req.destroy(new Error("The export download timed out.")),
        TIMEOUT_MS,
      );
      req.on("timeout", () => req.destroy(new Error("The export download timed out.")));
      req.on("error", reject);
      req.on("close", () => clearTimeout(timer));
      req.end();
    });
}
