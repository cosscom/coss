/**
 * Test helpers: deterministic dependencies (fixed IP data, fake DNS, in-memory velocity) and the
 * addresses they know.
 */
import { MemoryStore } from "@coss/ratelimit";
import { fakeClassifier } from "@coss/screening/testing";
import type { CaptchaVerdict } from "@coss/signals/captcha";
import type { MailDomainVerdict } from "@coss/signals/email";
import {
  type AsnRecord,
  createIpIntelligence,
  type IpIntelligence,
  IpRangeSet,
} from "@coss/signals/ip";
import { TEST_SECRETS_KEYS } from "@coss/webhooks/testing";
import type { RiskDeps } from "./assess.ts";
import type { IpIntelligenceSource } from "./datasets.ts";
import { DEVICE_TOKEN_PREFIX } from "./device.ts";
import type { DomainAgeLookup } from "./domain-age.ts";
import { riskHasher } from "./hash.ts";
import type { PhoneData, PhoneLookup } from "./phone.ts";
import type { IpPrivacy, IpPrivacyLookup } from "./privacy.ts";
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

/** Fake RDAP: listed domains were registered that many days ago; others have no record. */
export function fakeDomainAges(ages: Record<string, number> = {}): DomainAgeLookup & {
  calls: string[];
} {
  const calls: string[] = [];
  const lookup = async (domain: string) => {
    calls.push(domain);
    const days = ages[domain];
    return days === undefined
      ? { status: "not_found" as const, registeredAt: null }
      : // An hour more, so `days` survives the time between the lookup and the age's "now".
        {
          status: "found" as const,
          registeredAt: new Date(Date.now() - days * 86_400_000 - 3_600_000),
        };
  };
  return Object.assign(lookup, { calls });
}

/** Fake siteverify: listed tokens pass or fail; others make the provider throw. */
export function fakeCaptcha(
  tokens: Record<string, boolean> = {},
): NonNullable<RiskDeps["verifyCaptcha"]> & { calls: { token: string; secret: string }[] } {
  const calls: { token: string; secret: string }[] = [];
  const verify = async (input: { token: string; secret: string }): Promise<CaptchaVerdict> => {
    calls.push({ token: input.token, secret: input.secret });
    const success = tokens[input.token];
    if (success === undefined) throw new Error("siteverify unreachable");
    return {
      success,
      hostname: "acme.test",
      action: null,
      errorCodes: success ? [] : ["invalid-input-response"],
    };
  };
  return Object.assign(verify, { calls }) as NonNullable<RiskDeps["verifyCaptcha"]> & {
    calls: { token: string; secret: string }[];
  };
}

/** A device token as `coss/device` makes it (`at` defaults to now). */
export function testDeviceToken(opts: {
  id: string;
  automation?: boolean;
  at?: number;
  timezone?: string;
}): string {
  const payload = {
    id: opts.id,
    t: opts.at ?? Date.now(),
    tz: opts.timezone ?? "Europe/Berlin",
    l: ["de-DE", "en"],
    p: "MacIntel",
    s: [1512, 982],
    tp: 0,
    wd: opts.automation ?? false,
    hl: false,
  };
  return `${DEVICE_TOKEN_PREFIX}${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
}

/** Fake privacy provider: listed addresses get their answer, `"fail"` throws, others `null`. */
export function fakeIpPrivacy(
  answers: Record<string, Partial<IpPrivacy> | "fail"> = {},
): IpPrivacyLookup & { calls: string[] } {
  const calls: string[] = [];
  const lookup = async (ip: string) => {
    calls.push(ip);
    const answer = answers[ip];
    if (answer === "fail") throw new Error("provider unreachable");
    if (!answer) return null;
    return { vpn: false, proxy: false, relay: false, service: null, ...answer };
  };
  return Object.assign(lookup, { calls });
}

/**
 * Fake phone data provider: listed numbers get their answer over an ordinary US mobile, `"fail"`
 * throws, others are ordinary US mobiles.
 */
export function fakePhoneLookup(
  answers: Record<string, Partial<PhoneData> | "fail"> = {},
): PhoneLookup & { calls: string[] } {
  const calls: string[] = [];
  const lookup = async (phone: string): Promise<PhoneData> => {
    calls.push(phone);
    const answer = answers[phone];
    if (answer === "fail") throw new Error("provider unreachable");
    return {
      valid: true,
      country: "US",
      lineType: "mobile",
      carrier: { name: "Test Wireless", mobileCountryCode: "001", mobileNetworkCode: "01" },
      simSwap: null,
      missing: [],
      ...answer,
    };
  };
  return Object.assign(lookup, { calls });
}

export const TEST_HASH_KEY: Uint8Array = new TextEncoder().encode(
  "coss-risk-test-hash-key-0123456789abcdef",
);

/**
 * Dependencies for tests: a fresh in-memory velocity store and rate limit store, its own key
 * prefix, the fake classifier (`[coss-test:<category>]` markers, also in live environments) and
 * the fake phone data provider.
 */
export function testRiskDeps(
  overrides: Partial<RiskDeps> = {},
): RiskDeps & { velocity: MemoryVelocityStore | RiskDeps["velocity"] } {
  return {
    hash: riskHasher(TEST_HASH_KEY),
    ipIntelligence: staticIpIntelligence(testIpIntelligence()),
    velocity: new MemoryVelocityStore(),
    keyPrefix: `test-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    checkMailDomain: fakeMailDomains(),
    domainAge: fakeDomainAges(),
    secretsKeys: TEST_SECRETS_KEYS,
    verifyCaptcha: fakeCaptcha(),
    classifier: fakeClassifier(),
    limits: new MemoryStore(),
    phoneLookup: fakePhoneLookup(),
    ...overrides,
  } as RiskDeps & { velocity: MemoryVelocityStore | RiskDeps["velocity"] };
}
