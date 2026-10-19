/**
 * How an SMS body is split into segments, the unit carriers deliver and coss.com bills. A body made
 * only of GSM-7 characters takes 160 per message (153 per segment once it is split: the rest is the
 * concatenation header); anything else is sent as UCS-2, 70 per message (67 per segment). GSM-7's
 * extension characters (`€`, `[`, `{`, …) take two septets, and neither they nor a UTF-16
 * surrogate pair (an emoji) are ever split across segments. Toll-free numbers' multipart messages
 * (to the US and Canada, all they reach) take one unit less per segment: 152 and 66. Twilio counts
 * the same way as long as its Smart Encoding stays off (it is: coss.com bills what it counts
 * here). Client-safe, no imports.
 */

const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXTENSION = "\f^{}\\[~]|€";

const BASIC = new Set(GSM_BASIC);
const EXTENSION = new Set(GSM_EXTENSION);

export type SmsEncoding = "gsm7" | "ucs2";

/** At most this many segments per message (Twilio's own limit for reliable delivery). */
export const MAX_SMS_SEGMENTS = 10;
/** At most this many characters (UTF-16 code units) in a body. */
export const MAX_SMS_BODY_LENGTH = 1600;

const LIMITS: Record<SmsEncoding, { single: number; part: number }> = {
  gsm7: { single: 160, part: 153 },
  ucs2: { single: 70, part: 67 },
};
const TOLL_FREE_LIMITS: Record<SmsEncoding, { single: number; part: number }> = {
  gsm7: { single: 160, part: 152 },
  ucs2: { single: 70, part: 66 },
};

export type SmsSegmentation = {
  encoding: SmsEncoding;
  segments: number;
  /** Septets (GSM-7) or UTF-16 code units (UCS-2) the body takes. */
  units: number;
  /** How many more units fit in the last segment. */
  remaining: number;
};

/** Whether every character of `body` is in the GSM-7 alphabet (basic or extension table). */
export function isGsm7(body: string): boolean {
  for (const char of body) if (!BASIC.has(char) && !EXTENSION.has(char)) return false;
  return true;
}

/** The size of each character, as units that may not be split. */
function characterSizes(body: string, encoding: SmsEncoding): number[] {
  const sizes: number[] = [];
  for (const char of body) {
    sizes.push(encoding === "gsm7" ? (EXTENSION.has(char) ? 2 : 1) : char.length);
  }
  return sizes;
}

/**
 * Encoding and segment count of a body (`tollFree`: sent from a toll-free number). An empty body
 * is one (empty) segment.
 */
export function countSegments(body: string, opts: { tollFree?: boolean } = {}): SmsSegmentation {
  const encoding: SmsEncoding = isGsm7(body) ? "gsm7" : "ucs2";
  const sizes = characterSizes(body, encoding);
  const units = sizes.reduce((total, size) => total + size, 0);
  const limit = (opts.tollFree ? TOLL_FREE_LIMITS : LIMITS)[encoding];
  if (units <= limit.single) {
    return { encoding, segments: 1, units, remaining: limit.single - units };
  }
  // Pack whole characters into segments of `part` units each.
  let segments = 1;
  let used = 0;
  for (const size of sizes) {
    if (used + size > limit.part) {
      segments++;
      used = 0;
    }
    used += size;
  }
  return { encoding, segments, units, remaining: limit.part - used };
}
