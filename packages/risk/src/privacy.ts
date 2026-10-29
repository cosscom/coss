/**
 * IP privacy data: whether an address is a VPN exit, a proxy (residential ones included) or a
 * privacy relay, from a paid provider. The free datasets only know networks (`ip.vpn_network` is a
 * guess from the ASN); a provider knows addresses. Pluggable: `IpPrivacyLookup` is all assessments
 * need, and IPinfo's privacy detection is the one implementation. Only the address is sent, and
 * answers are cached in memory, so a busy address costs one lookup per `ttlMs`.
 */
import { isBlockedAddress } from "@coss/signals/ip";
import { z } from "zod";
import { AnswerCache } from "./answer-cache.ts";

export type IpPrivacy = { vpn: boolean; proxy: boolean; relay: boolean; service: string | null };

/** `null`: the provider knows nothing about the address. Throws when the provider fails. */
export type IpPrivacyLookup = (ip: string, signal: AbortSignal) => Promise<IpPrivacy | null>;

const IpinfoPrivacyResponse = z.object({
  vpn: z.boolean().optional(),
  proxy: z.boolean().optional(),
  relay: z.boolean().optional(),
  service: z.string().optional(),
});

/**
 * IPinfo's privacy detection (`https://ipinfo.io/<ip>/privacy`, a paid plan's token). Private and
 * reserved addresses are never sent.
 */
export function ipinfoPrivacyLookup(opts: {
  token: string;
  fetch?: typeof fetch;
  /** Default 6 hours: VPN and proxy exits change slowly. */
  ttlMs?: number;
  maxEntries?: number;
  now?: () => number;
}): IpPrivacyLookup {
  const fetcher = opts.fetch ?? fetch;
  const now = opts.now ?? Date.now;
  const cache = new AnswerCache<IpPrivacy | null>(
    opts.maxEntries ?? 50_000,
    opts.ttlMs ?? 6 * 60 * 60_000,
  );
  return async (ip, signal) => {
    if (isBlockedAddress(ip)) return null;
    const cached = cache.get(ip, now());
    if (cached) return cached.value;
    const response = await fetcher(`https://ipinfo.io/${encodeURIComponent(ip)}/privacy`, {
      headers: { authorization: `Bearer ${opts.token}`, accept: "application/json" },
      signal,
    });
    if (response.status === 404) {
      cache.set(ip, null, now());
      return null;
    }
    if (!response.ok) throw new Error(`IPinfo privacy answered ${response.status}`);
    const body = IpinfoPrivacyResponse.parse(await response.json());
    const value: IpPrivacy = {
      vpn: body.vpn ?? false,
      proxy: body.proxy ?? false,
      relay: body.relay ?? false,
      service: body.service?.trim() || null,
    };
    cache.set(ip, value, now());
    return value;
  };
}
