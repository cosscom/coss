/** The DNS records a sending domain needs, and checks of what DNS actually serves. */
import { Resolver } from "node:dns/promises";
import type { DomainRecord } from "@coss/db/schema";

/** The subset of `node:dns/promises` `Resolver` the checks use (fakeable in tests). */
export type DnsResolver = {
  resolveCname(hostname: string): Promise<string[]>;
  resolveMx(hostname: string): Promise<{ exchange: string; priority: number }[]>;
  resolveTxt(hostname: string): Promise<string[][]>;
};

/**
 * A resolver that asks public DNS (what the provider and mailbox providers see), not the
 * machine's own resolver, which may serve split-horizon answers.
 */
export function publicDnsResolver(): DnsResolver {
  const resolver = new Resolver({ timeout: 3000, tries: 2 });
  resolver.setServers(["1.1.1.1", "8.8.8.8"]);
  return resolver;
}

export const RECOMMENDED_DMARC = "v=DMARC1; p=none;";
const SPF_VALUE = "v=spf1 include:amazonses.com ~all";

/** The records to publish for a domain, all `not_checked`. */
export function expectedRecords(domain: {
  name: string;
  dkimTokens: string[];
  dkimHostedZone: string | null;
  mailFromDomain: string;
  region: string | null;
}): DomainRecord[] {
  const base = { priority: null, required: true, status: "not_checked" as const, found: [] };
  const records: DomainRecord[] = domain.dkimTokens.map((token) => ({
    ...base,
    purpose: "dkim",
    type: "CNAME",
    name: `${token}._domainkey.${domain.name}`,
    value: `${token}.${domain.dkimHostedZone ?? "dkim.amazonses.com"}`,
  }));
  records.push(
    {
      ...base,
      purpose: "mail_from_mx",
      type: "MX",
      name: domain.mailFromDomain,
      value: `feedback-smtp.${domain.region ?? "us-east-1"}.amazonses.com`,
      priority: 10,
    },
    {
      ...base,
      purpose: "mail_from_spf",
      type: "TXT",
      name: domain.mailFromDomain,
      value: SPF_VALUE,
    },
    {
      ...base,
      purpose: "dmarc",
      type: "TXT",
      name: `_dmarc.${domain.name}`,
      value: RECOMMENDED_DMARC,
      required: false,
    },
  );
  return records;
}

function normalizeHost(value: string): string {
  return value.toLowerCase().replace(/\.$/, "");
}

/** Missing names and empty answers are "not found"; anything else is a lookup failure. */
async function lookup<T>(query: () => Promise<T[]>): Promise<T[] | null> {
  try {
    return await query();
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "ENOTIMP") return [];
    return null;
  }
}

async function checkRecord(record: DomainRecord, dns: DnsResolver): Promise<DomainRecord> {
  let found: string[] | null;
  let matches: (values: string[]) => boolean;
  switch (record.type) {
    case "CNAME": {
      const answers = await lookup(() => dns.resolveCname(record.name));
      found = answers?.map(normalizeHost) ?? null;
      matches = (values) => values.includes(normalizeHost(record.value));
      break;
    }
    case "MX": {
      const answers = await lookup(() => dns.resolveMx(record.name));
      found = answers?.map((mx) => `${mx.priority} ${normalizeHost(mx.exchange)}`) ?? null;
      // The MAIL FROM subdomain must have exactly one MX record, pointing at the provider.
      matches = (values) =>
        values.length === 1 && values[0]?.split(" ")[1] === normalizeHost(record.value);
      break;
    }
    case "TXT": {
      const answers = await lookup(() => dns.resolveTxt(record.name));
      found = answers?.map((chunks) => chunks.join("")) ?? null;
      matches =
        record.purpose === "dmarc"
          ? (values) => values.some((value) => /^v=DMARC1\b/i.test(value.trim()))
          : (values) =>
              values.some(
                (value) => /^v=spf1\b/i.test(value) && /\binclude:amazonses\.com\b/i.test(value),
              );
      break;
    }
  }
  if (found === null) return { ...record, status: "not_checked", found: [] };
  if (found.length === 0) return { ...record, status: "missing", found: [] };
  return matches(found)
    ? { ...record, status: "verified", found: [] }
    : { ...record, status: "mismatch", found: found.slice(0, 5) };
}

/** Checks every record against DNS; without a resolver they stay `not_checked`. */
export async function checkRecords(
  records: DomainRecord[],
  dns: DnsResolver | null,
): Promise<DomainRecord[]> {
  if (!dns) return records.map((record) => ({ ...record, status: "not_checked", found: [] }));
  return Promise.all(records.map((record) => checkRecord(record, dns)));
}
