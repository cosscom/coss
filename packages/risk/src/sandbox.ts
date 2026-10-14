/**
 * Fixed signals for sandbox environments, so integrations can exercise every decision without
 * real abuse: documentation addresses (192.0.2.0/24, RFC 5737), `.test` email domains (RFC 6761),
 * captcha tokens and content markers behave as documented in the "Testing" guide. Live
 * environments never use these.
 */
import type { MailDomainVerdict } from "@coss/signals/email";
import { type IpSignals, normalizeIp } from "@coss/signals/ip";
import { CONTENT_CATEGORIES, type ContentCategory } from "./schemas.ts";

const RESIDENTIAL = { asn: 64500, as_name: "Example Broadband", country: "GB" } as const;

const IP_FIXTURES: Record<string, Partial<IpSignals>> = {
  "192.0.2.1": { tor: true, asn: 64501, as_name: "Example Tor Relays", country: "DE" },
  "192.0.2.2": {
    hosting: true,
    hosting_provider: "aws",
    hosting_kind: "cloud",
    cloud_provider: "aws",
    asn: 16509,
    as_name: "Amazon.com, Inc.",
    country: "US",
  },
  "192.0.2.3": {
    hosting: true,
    hosting_provider: "m247",
    hosting_kind: "vpn",
    asn: 9009,
    as_name: "M247 Europe SRL",
    country: "RO",
  },
};

/** Signals for a documentation address (`192.0.2.x`): Tor, cloud, VPN, or a clean home connection. */
export function sandboxIpSignals(address: string): IpSignals | null {
  const ip = normalizeIp(address);
  if (!ip?.startsWith("192.0.2.")) return null;
  return {
    address: ip,
    version: 4,
    bogon: false,
    tor: false,
    cloud_provider: null,
    hosting: false,
    hosting_provider: null,
    hosting_kind: null,
    ...RESIDENTIAL,
    ...IP_FIXTURES[ip],
  };
}

/** Email domains with fixed behaviour in sandbox environments. */
export const SANDBOX_DISPOSABLE_DOMAIN = "disposable.test";
export const SANDBOX_UNDELIVERABLE_DOMAIN = "undeliverable.test";

/** Deliverability of a `.test` domain in a sandbox (no DNS): only `undeliverable.test` fails. */
export function sandboxMailDomainVerdict(domain: string): MailDomainVerdict | null {
  if (!domain.endsWith(".test") && domain !== "test") return null;
  return domain === SANDBOX_UNDELIVERABLE_DOMAIN ? "undeliverable" : "deliverable";
}

/** A domain registered 2 days ago in sandbox environments (`email.domain_new`). */
export const SANDBOX_NEW_DOMAIN = "new.test";

/** Domain age of a `.test` domain in a sandbox: `new.test` is 2 days old, the rest unknown. */
export function sandboxDomainAgeDays(domain: string): number | null {
  return domain === SANDBOX_NEW_DOMAIN ? 2 : null;
}

/** Captcha tokens with a fixed verdict in sandbox environments (no provider needed). */
export const SANDBOX_CAPTCHA_TOKENS = { pass: "test-pass", fail: "test-fail" } as const;

export function sandboxCaptchaVerdict(token: string): boolean | null {
  if (token === SANDBOX_CAPTCHA_TOKENS.pass) return true;
  if (token === SANDBOX_CAPTCHA_TOKENS.fail) return false;
  return null;
}

const CONTENT_MARKER = /\[coss-test:([a-z]+)(?::([01](?:\.\d+)?))?\]/g;

/**
 * Content scores in sandbox environments (no model): `[coss-test:<category>]` in the text scores
 * 0.99 in that category, `[coss-test:<category>:<score>]` exactly `<score>`; the rest score 0.01.
 * The same markers as COSS's own content screening.
 */
export function sandboxContentScores(text: string): Record<ContentCategory, number> {
  const scores = Object.fromEntries(
    CONTENT_CATEGORIES.map((category) => [category, 0.01]),
  ) as Record<ContentCategory, number>;
  for (const [, category, score] of text.matchAll(CONTENT_MARKER)) {
    if ((CONTENT_CATEGORIES as readonly string[]).includes(category ?? "")) {
      scores[category as ContentCategory] = score === undefined ? 0.99 : Number(score);
    }
  }
  return scores;
}
