/**
 * Device tokens: what `collectDevice()` (`coss/device`, in the user's browser) reports, passed
 * through the customer's server as `device.token`. The token carries a random id the browser keeps
 * in its own storage (risk only ever stores its keyed hash) and a few coarse, non-identifying facts
 * (time zone, language, platform, screen size, touch) plus automation markers.
 *
 * Tokens are not signed: they come from the browser, so whoever controls it can write anything
 * into one. A forged token can hide automation or pose as a new device, never make a known device
 * look like someone else's without its id; rules should treat device facts as hints.
 */
import { z } from "zod";
import type { StoredSignals } from "./read.ts";
import { sandboxDevice } from "./sandbox.ts";
import { DEVICE_TOKEN_MAX_AGE_MS } from "./schemas.ts";

/** The token's prefix and format version (`cd1.<base64url JSON>`). */
export const DEVICE_TOKEN_PREFIX = "cd1.";

/** Clocks drift: a token from up to this far in the future still counts. */
const MAX_CLOCK_SKEW_MS = 5 * 60_000;

const DevicePayload = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
  t: z.number().int(),
  tz: z.string().max(64).nullable(),
  l: z.array(z.string().max(35)).max(10),
  p: z.string().max(64).nullable(),
  s: z
    .tuple([z.number().int().min(0).max(100_000), z.number().int().min(0).max(100_000)])
    .nullable(),
  tp: z.number().int().min(0).max(1000).nullable(),
  wd: z.boolean(),
  hl: z.boolean(),
});

export type DeviceSignals = NonNullable<StoredSignals["device"]>;

/** What an assessment learns from a token: the device id (to hash) and its signals. */
export type DeviceReading = { id: string | null; signals: DeviceSignals };

const INVALID: DeviceReading = {
  id: null,
  signals: {
    valid: false,
    automation: false,
    timezone: null,
    language: null,
    platform: null,
    screen: null,
    touch: null,
  },
};

function decodeBase64Url(value: string): string | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

/** Reads a token; malformed or stale ones are `valid: false` with no id. */
export function readDeviceToken(
  token: string,
  opts: { sandbox: boolean; now?: number },
): DeviceReading {
  const fixture = opts.sandbox ? sandboxDevice(token) : null;
  if (fixture) return fixture;
  if (!token.startsWith(DEVICE_TOKEN_PREFIX)) return INVALID;
  const json = decodeBase64Url(token.slice(DEVICE_TOKEN_PREFIX.length));
  if (json === null) return INVALID;
  let parsed: z.infer<typeof DevicePayload>;
  try {
    const result = DevicePayload.safeParse(JSON.parse(json));
    if (!result.success) return INVALID;
    parsed = result.data;
  } catch {
    return INVALID;
  }
  const now = opts.now ?? Date.now();
  if (parsed.t < now - DEVICE_TOKEN_MAX_AGE_MS || parsed.t > now + MAX_CLOCK_SKEW_MS) {
    return INVALID;
  }
  return {
    id: parsed.id,
    signals: {
      valid: true,
      automation: parsed.wd || parsed.hl,
      timezone: parsed.tz,
      language: parsed.l[0] ?? null,
      platform: parsed.p,
      screen: parsed.s ? `${parsed.s[0]}x${parsed.s[1]}` : null,
      touch: parsed.tp === null ? null : parsed.tp > 0,
    },
  };
}
