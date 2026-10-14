/**
 * Fixed signals for sandbox environments, so integrations can exercise every decision without
 * real abuse: documentation addresses (192.0.2.0/24, RFC 5737) and `.test` email domains
 * (RFC 6761) behave as documented in the "Testing" guide. Live environments never use these.
 */
import type { MailDomainVerdict } from "@coss/signals/email";
import { type IpSignals, normalizeIp } from "@coss/signals/ip";

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
