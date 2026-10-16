/**
 * BIMI (brand logos in inboxes): checks what mailbox providers will find in DNS — the domain's
 * `default._bimi` record and whether DMARC is enforced. DNS only: coss.com never fetches the logo or
 * the VMC/CMC certificate (customers' own; mailbox providers validate them).
 */
import type { DomainBimi } from "@coss/db/schema";
import { getDomain } from "tldts";
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
 * first of a repeated tag kept. `duplicate` says a tag was repeated and `malformed` that a
 * non-empty part wasn't a `tag=value` (either makes a BIMI record invalid).
 */
export function parseTagList(
  value: string,
): Map<string, string> & { duplicate: boolean; malformed: boolean } {
  const tags = Object.assign(new Map<string, string>(), { duplicate: false, malformed: false });
  for (const part of value.split(";")) {
    if (!part.trim()) continue;
    const index = part.indexOf("=");
    const key = index < 0 ? "" : part.slice(0, index).trim().toLowerCase();
    if (!key) tags.malformed = true;
    else if (tags.has(key)) tags.duplicate = true;
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
 * The DMARC tags at `_dmarc.<domain>`: `undefined` without a record, `null` for an invalid one
 * (more than one record, or an invalid tag list as in DKIM: a tag listed twice, or a part that
 * isn't a `tag=value`).
 */
async function dmarcTagsAt(
  domain: string,
  dns: DnsResolver,
): Promise<Map<string, string> | null | undefined> {
  const records = (await txt(`_dmarc.${domain}`, dns)).filter((value) => DMARC_RECORD.test(value));
  const [record] = records;
  if (record === undefined) return undefined;
  const tags = parseTagList(record);
  return records.length > 1 || tags.duplicate || tags.malformed ? null : tags;
}

function dmarcOf(domain: string, tags: Map<string, string>, policy: string | undefined): Dmarc {
  const pct = Number.parseInt(tags.get("pct") ?? "", 10);
  return {
    domain,
    policy: policyOf(policy),
    partial: (Number.isFinite(pct) && pct < 100) || tags.get("t")?.toLowerCase() === "y",
  };
}

/** The organizational domain (RFC 7489): the registrable domain, by the public suffix list. */
export function organizationalDomain(domainName: string): string {
  return getDomain(domainName) ?? domainName;
}

/**
 * The DMARC policy that applies to a domain as receivers find it (RFC 7489): its own record's
 * `p`, else the organizational domain's `sp` (else `p`); an invalid record of its own means no
 * DMARC. Also the organizational domain's own policy, which BIMI needs fully enforced too.
 * `null` for no valid record.
 */
async function dmarcFor(
  domainName: string,
  organizational: string,
  dns: DnsResolver,
): Promise<{ applies: Dmarc | null; organizational: Dmarc | null }> {
  const own = await dmarcTagsAt(domainName, dns);
  const ownDmarc = own ? dmarcOf(domainName, own, own.get("p")) : null;
  if (domainName === organizational) return { applies: ownDmarc, organizational: ownDmarc };
  const parent = await dmarcTagsAt(organizational, dns);
  const parentDmarc = parent ? dmarcOf(organizational, parent, parent.get("p")) : null;
  if (own !== undefined) return { applies: ownDmarc, organizational: parentDmarc };
  return {
    applies: parent ? dmarcOf(organizational, parent, parent.get("sp") ?? parent.get("p")) : null,
    organizational: parentDmarc,
  };
}

/**
 * The domain's BIMI records, else the organizational domain's, which providers fall back to.
 * Unrelated TXT records at a name don't count as a record there.
 */
async function bimiRecordsFor(
  domainName: string,
  organizational: string,
  dns: DnsResolver,
): Promise<{ name: string; values: string[] }> {
  for (const domain of new Set([domainName, organizational])) {
    const name = `default._bimi.${domain}`;
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
    const orgDomain = organizationalDomain(domainName);
    const { applies: dmarc, organizational } = await dmarcFor(domainName, orgDomain, dns);
    const issues: Issue[] = [];
    if (!dmarc || !organizational) issues.push("dmarc_missing");
    else if (dmarc.policy === "none" || organizational.policy === "none") {
      issues.push("dmarc_not_enforced");
    } else if (dmarc.partial || organizational.partial) issues.push("dmarc_partial");

    const found = await bimiRecordsFor(domainName, orgDomain, dns);
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
    if (records.length !== 1 || tags.duplicate || tags.malformed) {
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
