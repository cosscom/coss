/**
 * Parsers for the public IP feeds behind `IpIntelligence`, and the compact formats coss.com stores them
 * in. Fetching, validation and storage live with the product that refreshes them
 * (`@coss/risk`'s dataset loop); nothing here touches the network.
 */
import { Reader, type Response } from "mmdb-lib";
import {
  type AsnLookup,
  type AsnRecord,
  formatCidr,
  IpRangeSet,
  normalizeIp,
  parseCidr,
} from "./ip.ts";

export type CloudRange = { cidr: string; provider: string };

/** A feed's top-level JSON value as an object (`{}` for anything else, e.g. `null`). */
function asObject<T>(json: unknown): Partial<T> {
  return json && typeof json === "object" ? (json as Partial<T>) : {};
}

function canonicalCidr(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const network = parseCidr(text);
  return network ? formatCidr(network) : null;
}

/** The Tor Project's bulk exit list (`check.torproject.org/torbulkexitlist`): one address a line. */
export function parseTorExitList(text: string): string[] {
  const addresses = new Set<string>();
  for (const line of text.split("\n")) {
    const value = line.trim();
    if (!value || value.startsWith("#")) continue;
    const address = normalizeIp(value);
    if (address) addresses.add(address);
  }
  return [...addresses].sort();
}

/** AWS `ip-ranges.json`: `prefixes[].ip_prefix` and `ipv6_prefixes[].ipv6_prefix`. */
export function parseAwsRanges(json: unknown): CloudRange[] {
  const data = asObject<{
    prefixes: { ip_prefix?: unknown }[];
    ipv6_prefixes: { ipv6_prefix?: unknown }[];
  }>(json);
  return [
    ...(data.prefixes ?? []).map((p) => p.ip_prefix),
    ...(data.ipv6_prefixes ?? []).map((p) => p.ipv6_prefix),
  ].flatMap((cidr) => cloudRange(cidr, "aws"));
}

/** Google Cloud `cloud.json`: `prefixes[].ipv4Prefix | ipv6Prefix`. */
export function parseGcpRanges(json: unknown): CloudRange[] {
  const data = asObject<{ prefixes: { ipv4Prefix?: unknown; ipv6Prefix?: unknown }[] }>(json);
  return (data.prefixes ?? []).flatMap((p) => cloudRange(p.ipv4Prefix ?? p.ipv6Prefix, "gcp"));
}

/** Oracle Cloud `public_ip_ranges.json`: `regions[].cidrs[].cidr`. */
export function parseOracleRanges(json: unknown): CloudRange[] {
  const data = asObject<{ regions: { cidrs?: { cidr?: unknown }[] }[] }>(json);
  return (data.regions ?? []).flatMap((region) =>
    (region.cidrs ?? []).flatMap((c) => cloudRange(c.cidr, "oracle")),
  );
}

/** DigitalOcean's geofeed CSV (`digitalocean.com/geo/google.csv`): the CIDR is the first column. */
export function parseDigitalOceanRanges(text: string): CloudRange[] {
  return text
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"))
    .flatMap((line) => cloudRange(line.split(",")[0]?.trim(), "digitalocean"));
}

function cloudRange(cidr: unknown, provider: string): CloudRange[] {
  const canonical = canonicalCidr(cidr);
  return canonical ? [{ cidr: canonical, provider }] : [];
}

/** The stored cloud dataset: `cidr provider` lines, de-duplicated and sorted. */
export function encodeCloudDataset(ranges: Iterable<CloudRange>): string {
  const lines = new Set<string>();
  for (const range of ranges) lines.add(`${range.cidr} ${range.provider}`);
  return [...lines].sort().join("\n");
}

export function decodeCloudDataset(text: string): IpRangeSet<string> {
  return IpRangeSet.from(
    text
      .split("\n")
      .map((line) => line.split(" "))
      .filter((parts): parts is [string, string] => parts.length === 2)
      .map(([cidr, provider]) => [cidr, provider] as const),
  );
}

/** The stored Tor dataset is the normalized exit list, one address a line. */
export function encodeTorDataset(addresses: Iterable<string>): string {
  return [...new Set(addresses)].sort().join("\n");
}

export function decodeTorDataset(text: string): IpRangeSet<true> {
  return IpRangeSet.from(
    text
      .split("\n")
      .filter(Boolean)
      .map((address) => [address, true] as const),
  );
}

/** A record of IPinfo's free "Lite" database (`ipinfo_lite.mmdb`, CC BY-SA 4.0). */
type IpinfoLiteRecord = {
  asn?: string;
  as_name?: string;
  as_domain?: string;
  country_code?: string;
};

/** The number of search-tree nodes in an MMDB file (tracks how many networks it covers). */
export function mmdbNodeCount(mmdb: Uint8Array): number {
  return new Reader<Response>(Buffer.from(mmdb)).metadata.nodeCount;
}

/**
 * ASN and country from an IPinfo Lite MMDB file. Throws when the file doesn't parse; callers that
 * replace a stored copy also check a few well-known networks (`validateAsnLookup`).
 */
export function ipinfoLiteLookup(mmdb: Uint8Array): AsnLookup {
  // mmdb-lib only types MaxMind's own databases.
  const reader = new Reader<Response>(Buffer.from(mmdb));
  return (address) => {
    let record: IpinfoLiteRecord | null;
    try {
      record = reader.get(address) as IpinfoLiteRecord | null;
    } catch {
      return null;
    }
    if (!record) return null;
    const asn = Number(record.asn?.replace(/^AS/i, ""));
    if (!Number.isSafeInteger(asn) || asn <= 0) return null;
    return {
      asn,
      name: record.as_name || null,
      domain: record.as_domain || null,
      country: record.country_code?.toUpperCase() || null,
    } satisfies AsnRecord;
  };
}
