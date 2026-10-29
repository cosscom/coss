/**
 * Phone number data, from a paid provider: whether the number exists in its country's numbering
 * plan, its line type (mobile, landline, fixed or non-fixed VoIP…) and carrier, and, once the
 * carriers have approved coss.com, when its SIM last changed (a SIM swap, how numbers are taken
 * over). Pluggable like IP privacy: `PhoneLookup` is all checks need, and Twilio Lookup is the one
 * implementation. Only the number is sent, and answers are cached in memory for an hour, so
 * checking one number again costs nothing.
 */
import { z } from "zod";
import { AnswerCache } from "./answer-cache.ts";
import type { PhoneLineType } from "./schemas.ts";

export type PhoneCarrier = {
  name: string | null;
  mobileCountryCode: string | null;
  mobileNetworkCode: string | null;
};

export type PhoneSimSwap = {
  /** The last SIM change, where the carrier tells the date. */
  swappedAt: string | null;
  /** The SIM changed within `period`. */
  recent: boolean;
  /** ISO 8601 duration agreed with the carriers (`PT48H`). */
  period: string | null;
};

export type PhoneData = {
  valid: boolean;
  /** ISO 3166-1 alpha-2. */
  country: string | null;
  lineType: PhoneLineType | null;
  carrier: PhoneCarrier | null;
  /** `null`: not asked, or the carrier or country isn't covered. */
  simSwap: PhoneSimSwap | null;
  /** Parts the provider answered with an error instead of data. */
  missing: ("line_type" | "sim_swap")[];
};

/** Throws when the provider fails. `phone` is E.164. */
export type PhoneLookup = (phone: string, signal: AbortSignal) => Promise<PhoneData>;

const E164 = /^\+[1-9]\d{6,14}$/;

/** E.164 from what was typed (spaces, dashes, dots and brackets dropped), or `null`. */
export function normalizePhone(input: string): string | null {
  const compact = input.replace(/[\s\-.()]/g, "");
  return E164.test(compact) ? compact : null;
}

const TWILIO_LINE_TYPES: Record<string, PhoneLineType> = {
  mobile: "mobile",
  landline: "landline",
  fixedVoip: "fixed_voip",
  nonFixedVoip: "non_fixed_voip",
  tollFree: "toll_free",
  premium: "premium",
  sharedCost: "shared_cost",
  personal: "personal",
  uan: "uan",
  voicemail: "voicemail",
  pager: "pager",
  unknown: "unknown",
};

const TwilioLookupResponse = z.object({
  valid: z.boolean(),
  country_code: z.string().nullish(),
  line_type_intelligence: z
    .object({
      type: z.string().nullish(),
      carrier_name: z.string().nullish(),
      mobile_country_code: z.string().nullish(),
      mobile_network_code: z.string().nullish(),
      error_code: z.number().nullish(),
    })
    .nullish(),
  sim_swap: z
    .object({
      last_sim_swap: z
        .object({
          last_sim_swap_date: z.string().nullish(),
          swapped_period: z.string().nullish(),
          swapped_in_period: z.boolean().nullish(),
        })
        .nullish(),
      error_code: z.number().nullish(),
    })
    .nullish(),
});

/** What Twilio Lookup's answer says about the number. */
export function fromTwilioLookup(body: unknown): PhoneData {
  const parsed = TwilioLookupResponse.parse(body);
  const missing: PhoneData["missing"] = [];
  if (!parsed.valid) {
    return { valid: false, country: null, lineType: null, carrier: null, simSwap: null, missing };
  }
  const line = parsed.line_type_intelligence;
  let lineType: PhoneLineType | null = null;
  let carrier: PhoneCarrier | null = null;
  // No line type for a valid number (an error, or no data at all) is a missing part: never billed.
  if (!line || line.error_code != null) missing.push("line_type");
  else {
    lineType = TWILIO_LINE_TYPES[line.type ?? ""] ?? "unknown";
    // Twilio has no carrier for toll-free, premium, personal… numbers.
    if (line.carrier_name) {
      carrier = {
        name: line.carrier_name,
        mobileCountryCode: line.mobile_country_code ?? null,
        mobileNetworkCode: line.mobile_network_code ?? null,
      };
    }
  }
  const swap = parsed.sim_swap;
  let simSwap: PhoneSimSwap | null = null;
  if (swap?.error_code != null) missing.push("sim_swap");
  else if (swap?.last_sim_swap) {
    simSwap = {
      swappedAt: swap.last_sim_swap.last_sim_swap_date ?? null,
      recent: swap.last_sim_swap.swapped_in_period ?? false,
      period: swap.last_sim_swap.swapped_period ?? null,
    };
  }
  return { valid: true, country: parsed.country_code ?? null, lineType, carrier, simSwap, missing };
}

/**
 * Twilio Lookup v2 (`https://lookups.twilio.com/v2/PhoneNumbers/<phone>`) with Line Type
 * Intelligence, and SIM Swap with `simSwap` (a private beta that needs each carrier's approval:
 * asking for it before then only returns errors).
 */
export function twilioPhoneLookup(opts: {
  accountSid: string;
  authToken: string;
  simSwap?: boolean;
  fetch?: typeof fetch;
  /** Default 1 hour: a SIM swap is news for a day or two. */
  ttlMs?: number;
  maxEntries?: number;
  now?: () => number;
}): PhoneLookup {
  const fetcher = opts.fetch ?? fetch;
  const now = opts.now ?? Date.now;
  const cache = new AnswerCache<PhoneData>(opts.maxEntries ?? 20_000, opts.ttlMs ?? 60 * 60_000);
  const fields = opts.simSwap ? "line_type_intelligence,sim_swap" : "line_type_intelligence";
  const authorization = `Basic ${btoa(`${opts.accountSid}:${opts.authToken}`)}`;
  return async (phone, signal) => {
    const cached = cache.get(phone, now());
    if (cached) return cached.value;
    const response = await fetcher(
      `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(phone)}?Fields=${fields}`,
      { headers: { authorization, accept: "application/json" }, signal },
    );
    if (!response.ok) throw new Error(`Twilio Lookup answered ${response.status}`);
    const data = fromTwilioLookup(await response.json());
    // Errors in a part (a carrier that didn't answer) are worth asking again.
    if (data.missing.length === 0) cache.set(phone, data, now());
    return data;
  };
}
