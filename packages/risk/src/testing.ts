/**
 * Test helpers: deterministic dependencies (fixed IP data, fake DNS, in-memory velocity) and the
 * addresses they know.
 */
import type { MailDomainVerdict } from "@coss/signals/email";
import {
  type AsnRecord,
  createIpIntelligence,
  type IpIntelligence,
  IpRangeSet,
} from "@coss/signals/ip";
import type { RiskDeps } from "./assess.ts";
import type { IpIntelligenceSource } from "./datasets.ts";
import { riskHasher } from "./hash.ts";
import { MemoryVelocityStore } from "./velocity.ts";

/** Public addresses with known signals in `testIpIntelligence()`. */
export const TEST_IPS = {
  /** A Tor exit node. */
  tor: "185.220.101.1",
  /** In AWS's published ranges. */
  aws: "3.4.5.6",
  /** At Hetzner (a hosting ASN). */
  hosting: "5.9.1.1",
  /** At M247 (a VPN-heavy ASN). */
  vpn: "89.187.1.1",
  /** A home connection in Germany. */
  residential: "81.2.69.142",
  /** A neighbour of `residential` (same /24). */
  neighbour: "81.2.69.200",
} as const;

const ASNS: [cidr: string, record: AsnRecord][] = [
  ["185.220.101.0/24", { asn: 60729, name: "Tor exit operator", domain: null, country: "DE" }],
  ["3.4.0.0/16", { asn: 16509, name: "Amazon.com, Inc.", domain: "amazon.com", country: "US" }],
  ["5.9.0.0/16", { asn: 24940, name: "Hetzner Online GmbH", domain: "hetzner.com", country: "DE" }],
  ["89.187.0.0/16", { asn: 9009, name: "M247 Europe SRL", domain: "m247.com", country: "RO" }],
  ["81.2.69.0/24", { asn: 3320, name: "Deutsche Telekom AG", domain: "telekom.de", country: "DE" }],
];

export function testIpIntelligence(): IpIntelligence {
  const asns = IpRangeSet.from(ASNS);
  return createIpIntelligence({
    tor: IpRangeSet.from([[TEST_IPS.tor, true as const]]),
    cloud: IpRangeSet.from([["3.4.0.0/16", "aws"]]),
    asn: (address) => asns.lookup(address),
  });
}

export function staticIpIntelligence(intelligence: IpIntelligence): IpIntelligenceSource {
  return { current: async () => intelligence };
}

/** Fake DNS: listed domains get their verdict, everything else is deliverable. */
export function fakeMailDomains(
  verdicts: Record<string, MailDomainVerdict> = {},
): RiskDeps["checkMailDomain"] {
  return async (domain) => verdicts[domain] ?? "deliverable";
}

export const TEST_HASH_KEY: Uint8Array = new TextEncoder().encode(
  "coss-risk-test-hash-key-0123456789abcdef",
);

/** Dependencies for tests, with a fresh in-memory velocity store and its own key prefix. */
export function testRiskDeps(
  overrides: Partial<RiskDeps> = {},
): RiskDeps & { velocity: MemoryVelocityStore | RiskDeps["velocity"] } {
  return {
    hash: riskHasher(TEST_HASH_KEY),
    ipIntelligence: staticIpIntelligence(testIpIntelligence()),
    velocity: new MemoryVelocityStore(),
    keyPrefix: `test-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    checkMailDomain: fakeMailDomains(),
    ...overrides,
  };
}
