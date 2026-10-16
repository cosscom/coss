/** The DNS records a sending domain needs, and checks of what DNS actually serves. */
import { Resolver } from "node:dns/promises";
import type { DomainRecord, ReceivingDomainRecord, TrackingDomainRecord } from "@coss/db/schema";
import { dmarcReportAddress, recommendedDmarc } from "./dmarc-record.ts";

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

const SPF_VALUE = "v=spf1 include:amazonses.com ~all";

/**
 * The records to publish for a domain, all `not_checked`. With a managed inbound domain
 * (`dmarcReportDomain`), the DMARC record sends aggregate reports to the domain's COSS address.
 */
export function expectedRecords(
  domain: {
    name: string;
    dkimTokens: string[];
    dkimHostedZone: string | null;
    mailFromDomain: string;
    region: string | null;
    dmarcReportToken: string;
  },
  dmarcReportDomain: string | null,
): DomainRecord[] {
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
      value: recommendedDmarc(dmarcReportAddress(domain.dmarcReportToken, dmarcReportDomain)),
      required: false,
    },
  );
  return records;
}

function normalizeHost(value: string): string {
  return value.toLowerCase().replace(/\.$/, "");
}

/** Missing names and empty answers are "not found"; anything else is a lookup failure. */
export async function lookup<T>(query: () => Promise<T[]>): Promise<T[] | null> {
  try {
    return await query();
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "ENOTIMP") return [];
    return null;
  }
}

const DMARC_RECORD = /^v\s*=\s*DMARC1\s*(;|$)/i;

type RecordCheck = { record: DomainRecord; answers: string[] | null };

async function checkRecord(record: DomainRecord, dns: DnsResolver): Promise<RecordCheck> {
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
          ? // Receivers ignore every DMARC record when a name publishes more than one.
            (values) => values.filter((value) => DMARC_RECORD.test(value.trim())).length === 1
          : (values) =>
              values.some(
                (value) => /^v=spf1\b/i.test(value) && /\binclude:amazonses\.com\b/i.test(value),
              );
      break;
    }
  }
  if (found === null)
    return { record: { ...record, status: "not_checked", found: [] }, answers: null };
  if (found.length === 0)
    return { record: { ...record, status: "missing", found: [] }, answers: [] };
  return {
    record: matches(found)
      ? { ...record, status: "verified", found: [] }
      : { ...record, status: "mismatch", found: found.slice(0, 5) },
    answers: found,
  };
}

/** Checks every record against DNS; without a resolver they stay `not_checked`. */
export async function checkRecords(
  records: DomainRecord[],
  dns: DnsResolver | null,
): Promise<DomainRecord[]> {
  return (await checkDomainDns(records, dns)).records;
}

/** The one `v=DMARC1` value among TXT answers; `null` for none, or several (receivers ignore both). */
function dmarcOf(answers: string[]): string | null {
  const values = answers.map((value) => value.trim()).filter((value) => DMARC_RECORD.test(value));
  return values.length === 1 ? (values[0] ?? null) : null;
}

/**
 * `checkRecords`, plus the domain's DMARC record as published: its one `v=DMARC1` value, `null`
 * when it has none (or several, which receivers ignore), `undefined` when DNS could not be asked.
 * `dmarcAbsent` says there was no `v=DMARC1` record at all, the only case in which receivers fall
 * back to the organizational domain's record.
 */
export async function checkDomainDns(
  records: DomainRecord[],
  dns: DnsResolver | null,
): Promise<{ records: DomainRecord[]; dmarc: string | null | undefined; dmarcAbsent: boolean }> {
  if (!dns) {
    return {
      records: records.map((record) => ({ ...record, status: "not_checked", found: [] })),
      dmarc: undefined,
      dmarcAbsent: false,
    };
  }
  const checks = await Promise.all(records.map((record) => checkRecord(record, dns)));
  const answers = checks.find((check) => check.record.purpose === "dmarc")?.answers ?? null;
  return {
    records: checks.map((check) => check.record),
    dmarc: answers === null ? undefined : dmarcOf(answers),
    dmarcAbsent: answers !== null && !answers.some((value) => DMARC_RECORD.test(value.trim())),
  };
}

/** The DMARC record at `_dmarc.<name>`, as `checkDomainDns` reads it (`undefined`: lookup failed). */
export async function dmarcRecordAt(
  name: string,
  dns: DnsResolver,
): Promise<string | null | undefined> {
  const answers = await lookup(() => dns.resolveTxt(`_dmarc.${name}`));
  return answers === null ? undefined : dmarcOf(answers.map((chunks) => chunks.join("")));
}

/** Checks a tracking domain's CNAME; without a resolver it stays `not_checked`. */
export async function checkTrackingRecord(
  record: TrackingDomainRecord,
  dns: DnsResolver | null,
): Promise<TrackingDomainRecord> {
  if (!dns) return { ...record, status: "not_checked", found: [] };
  const answers = await lookup(() => dns.resolveCname(record.name));
  if (answers === null) return { ...record, status: "not_checked", found: [] };
  const found = answers.map(normalizeHost);
  if (found.length === 0) return { ...record, status: "missing", found: [] };
  return found.includes(normalizeHost(record.value))
    ? { ...record, status: "verified", found: [] }
    : { ...record, status: "mismatch", found: found.slice(0, 5) };
}

/**
 * Checks a receiving domain's MX: mail goes to the most preferred (lowest priority) exchanges, so
 * every one of those must be the provider's inbound host. Without a resolver it stays `not_checked`.
 */
export async function checkReceivingRecord(
  record: ReceivingDomainRecord,
  dns: DnsResolver | null,
): Promise<ReceivingDomainRecord> {
  if (!dns) return { ...record, status: "not_checked", found: [] };
  const answers = await lookup(() => dns.resolveMx(record.name));
  if (answers === null) return { ...record, status: "not_checked", found: [] };
  if (answers.length === 0) return { ...record, status: "missing", found: [] };
  const preferred = Math.min(...answers.map((mx) => mx.priority));
  const verified = answers
    .filter((mx) => mx.priority === preferred)
    .every((mx) => normalizeHost(mx.exchange) === normalizeHost(record.value));
  return verified
    ? { ...record, status: "verified", found: [] }
    : {
        ...record,
        status: "mismatch",
        found: answers.slice(0, 5).map((mx) => `${mx.priority} ${normalizeHost(mx.exchange)}`),
      };
}
