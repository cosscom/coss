/**
 * BIMI (brand logos in inboxes): checks what mailbox providers will find in DNS — the domain's
 * `default._bimi` record and whether DMARC is enforced. DNS only: COSS never fetches the logo or
 * the VMC/CMC certificate (customers' own; mailbox providers validate them).
 */
import type { DomainBimi } from "@coss/db/schema";
import { type DnsResolver, lookup } from "./dns.ts";
import { BIMI_ISSUE_MESSAGES, type DomainBimiObjectOutput } from "./schemas.ts";

type Issue = DomainBimi["issues"][number];
type DmarcPolicy = NonNullable<DomainBimi["dmarcPolicy"]>;

/** The DMARC record that applies to a domain, and where it was found. */
type Dmarc = { domain: string; policy: DmarcPolicy; partial: boolean };

const DMARC_RECORD = /^v\s*=\s*DMARC1\s*(;|$)/i;
const BIMI_RECORD = /^v\s*=\s*BIMI1\s*(;|$)/i;
// Anything claiming to be BIMI (`v=BIMI…`), valid or not; other TXT records at the name are ignored.
const BIMI_LIKE = /^v\s*=\s*BIMI/i;

class LookupFailed extends Error {}

/**
 * Parses a DMARC/BIMI tag list (`v=BIMI1; l=…; a=…`): keys lower-cased, values trimmed, the
 * first of a repeated tag kept (`duplicate` says there was one: that makes a BIMI record invalid).
 */
export function parseTagList(value: string): Map<string, string> & { duplicate: boolean } {
  const tags = Object.assign(new Map<string, string>(), { duplicate: false });
  for (const part of value.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const key = part.slice(0, index).trim().toLowerCase();
    if (!key) continue;
    if (tags.has(key)) tags.duplicate = true;
    else tags.set(key, part.slice(index + 1).trim());
  }
  return tags;
}

async function txt(name: string, dns: DnsResolver): Promise<string[]> {
  const answers = await lookup(() => dns.resolveTxt(name));
  if (answers === null) throw new LookupFailed(name);
  return answers.map((chunks) => chunks.join("").trim());
}

function policyOf(value: string | undefined): DmarcPolicy {
  const policy = value?.toLowerCase();
  // An unknown or missing policy is treated as `none`, as receivers do.
  return policy === "quarantine" || policy === "reject" ? policy : "none";
}

/**
 * The domain's own DMARC record, else the nearest parent's (DMARCbis' tree walk, short of the
 * last label), whose `sp` (else `p`) applies. More than one record at a name means no DMARC.
 */
async function dmarcFor(domainName: string, dns: DnsResolver): Promise<Dmarc | null> {
  const labels = domainName.split(".");
  for (let start = 0; labels.length - start >= 2; start++) {
    const domain = labels.slice(start).join(".");
    const records = (await txt(`_dmarc.${domain}`, dns)).filter((value) =>
      DMARC_RECORD.test(value),
    );
    if (records.length > 1) return null;
    const [record] = records;
    if (record === undefined) continue;
    const tags = parseTagList(record);
    const pct = Number.parseInt(tags.get("pct") ?? "", 10);
    return {
      domain,
      policy: policyOf(start === 0 ? tags.get("p") : (tags.get("sp") ?? tags.get("p"))),
      partial: (Number.isFinite(pct) && pct < 100) || tags.get("t")?.toLowerCase() === "y",
    };
  }
  return null;
}

/**
 * The domain's BIMI records, else those of the organizational domain, which providers fall back
 * to. Without a public suffix list, that is the nearest parent with any (short of the last label).
 * Unrelated TXT records at a name don't count as a record there.
 */
async function bimiRecordsFor(
  domainName: string,
  dns: DnsResolver,
): Promise<{ name: string; values: string[] }> {
  const labels = domainName.split(".");
  for (let start = 0; labels.length - start >= 2; start++) {
    const name = `default._bimi.${labels.slice(start).join(".")}`;
    const values = (await txt(name, dns)).filter((value) => BIMI_LIKE.test(value));
    if (values.length > 0) return { name, values };
  }
  return { name: `default._bimi.${domainName}`, values: [] };
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** Checks a domain's BIMI record and DMARC policy; without a resolver it stays `not_checked`. */
export async function checkBimi(domainName: string, dns: DnsResolver | null): Promise<DomainBimi> {
  if (!dns) return notChecked(domainName);
  try {
    const dmarc = await dmarcFor(domainName, dns);
    const issues: Issue[] = [];
    if (!dmarc) issues.push("dmarc_missing");
    else if (dmarc.policy === "none") issues.push("dmarc_not_enforced");
    else if (dmarc.partial) issues.push("dmarc_partial");

    const found = await bimiRecordsFor(domainName, dns);
    const base = { name: found.name, dmarcPolicy: dmarc?.policy ?? null };
    if (found.values.length === 0) {
      return {
        ...base,
        status: "missing",
        record: null,
        logoUrl: null,
        certificateUrl: null,
        issues,
      };
    }
    const records = found.values.filter((value) => BIMI_RECORD.test(value));
    const record = records[0] ?? found.values[0] ?? null;
    const tags = parseTagList(record ?? "");
    if (records.length !== 1 || tags.duplicate) {
      issues.push(records.length > 1 ? "record_multiple" : "record_invalid");
      return { ...base, status: "invalid", record, logoUrl: null, certificateUrl: null, issues };
    }
    const logoUrl = tags.get("l") || null;
    const certificateUrl = tags.get("a") || null;
    if (!logoUrl) issues.push("logo_missing");
    else if (!isHttpsUrl(logoUrl)) issues.push("logo_not_https");
    if (!certificateUrl) issues.push("certificate_missing");
    else if (!isHttpsUrl(certificateUrl)) issues.push("certificate_not_https");
    return {
      ...base,
      status: issues.length === 0 ? "configured" : "invalid",
      record,
      logoUrl,
      certificateUrl,
      issues,
    };
  } catch (error) {
    // A lookup that failed (not one that found nothing) keeps the result unknown.
    if (error instanceof LookupFailed) return notChecked(domainName);
    throw error;
  }
}

function notChecked(domainName: string): DomainBimi {
  return {
    status: "not_checked",
    name: `default._bimi.${domainName}`,
    record: null,
    logoUrl: null,
    certificateUrl: null,
    dmarcPolicy: null,
    issues: [],
  };
}

/** The wire shape of a domain's last BIMI check (`not_checked` before the first). */
export function toBimiObject(row: {
  name: string;
  bimi: DomainBimi | null;
}): DomainBimiObjectOutput {
  const bimi = row.bimi ?? notChecked(row.name);
  return {
    status: bimi.status,
    name: bimi.name,
    record: bimi.record,
    logo_url: bimi.logoUrl,
    certificate_url: bimi.certificateUrl,
    dmarc_policy: bimi.dmarcPolicy,
    issues: bimi.issues.map((code) => ({ code, message: BIMI_ISSUE_MESSAGES[code] })),
  };
}
