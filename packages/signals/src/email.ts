/**
 * Email address signals: syntax, disposable domains, domains that can't receive mail, the mailbox
 * an address delivers to (`canonicalEmail`), role accounts, free providers and domain typos.
 * Stateless and server-only (DNS); no database access. Used by coss.com's own sign-up guard
 * (`@coss/auth`) and by risk assessments (`@coss/risk`).
 */
import { Resolver } from "node:dns/promises";
import { domainToASCII } from "node:url";
import { DISPOSABLE_DOMAINS } from "./disposable-domains.generated.ts";
import { FREE_PROVIDER_DOMAINS, POPULAR_DOMAINS, ROLE_LOCAL_PARTS } from "./email-lists.ts";

/** Listed upstream but allowed here (an upstream false positive): keep each with a reason. */
const ALLOWED_DOMAINS: ReadonlySet<string> = new Set<string>([]);
/** Seen in abuse of coss.com but not (yet) in the upstream list. */
const EXTRA_DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set<string>([]);

let disposable: ReadonlySet<string> | undefined;

/** The domain part of an address, lower-cased (`null` when it has none). */
export function emailDomainOf(email: string): string | null {
  const at = email.lastIndexOf("@");
  const domain =
    at < 0
      ? ""
      : email
          .slice(at + 1)
          .trim()
          .toLowerCase();
  return domain || null;
}

/** `domain` and its parents down to (excluding) the TLD: `a.b.example.com` → 3 names. */
export function domainAndParents(domain: string): string[] {
  const labels = domain.toLowerCase().replace(/\.$/, "").split(".");
  const names: string[] = [];
  for (let i = 0; i < labels.length - 1; i++) names.push(labels.slice(i).join("."));
  return names;
}

/** True when `domain` or any parent domain (`x.mailinator.com`) is a disposable-mail domain. */
export function isDisposableDomain(domain: string): boolean {
  disposable ??= new Set([
    ...DISPOSABLE_DOMAINS.split("\n").filter(Boolean),
    ...EXTRA_DISPOSABLE_DOMAINS,
  ]);
  for (const candidate of domainAndParents(domain)) {
    if (ALLOWED_DOMAINS.has(candidate)) return false;
    if (disposable.has(candidate)) return true;
  }
  return false;
}

/** Providers that deliver `local+tag@` to `local@` (Yahoo uses `-` and is left alone). */
const PLUS_ADDRESSING_DOMAINS: ReadonlySet<string> = new Set([
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "fastmail.com",
  "fastmail.fm",
  "proton.me",
  "protonmail.com",
  "pm.me",
]);

/**
 * The mailbox an address delivers to, for "one account per mailbox": lower-cased, Gmail's dots and
 * `googlemail.com` folded, `+tags` dropped at providers that ignore them. Other domains are only
 * lower-cased (their local parts may be case- or tag-sensitive). Mirrored in SQL by the backfill
 * migration of `user.canonical_email` (0033) — change both together.
 */
export function canonicalEmail(email: string): string {
  const address = email.trim().toLowerCase();
  const at = address.lastIndexOf("@");
  if (at < 0) return address;
  let local = address.slice(0, at);
  let domain = address.slice(at + 1);
  if (domain === "googlemail.com") domain = "gmail.com";
  if (PLUS_ADDRESSING_DOMAINS.has(domain)) local = local.split("+")[0] ?? "";
  if (domain === "gmail.com") local = local.replaceAll(".", "");
  return `${local}@${domain}`;
}

/** The subset of `node:dns/promises` `Resolver` the check uses (fakeable in tests). */
export type MailDnsResolver = {
  resolveMx(hostname: string): Promise<{ exchange: string; priority: number }[]>;
  resolve4(hostname: string): Promise<string[]>;
  resolve6(hostname: string): Promise<string[]>;
};

/** `unknown` (timeouts, SERVFAIL…) never blocks anyone: the check is best-effort. */
export type MailDomainVerdict = "deliverable" | "undeliverable" | "unknown";

/** `[]` for "no such records", `"nxdomain"` for "no such domain", `null` for a failed lookup. */
async function answers<T>(query: () => Promise<T[]>): Promise<T[] | "nxdomain" | null> {
  try {
    return await query();
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "ENOTFOUND") return "nxdomain";
    if (code === "ENODATA") return [];
    return null;
  }
}

/**
 * Whether `domain` can receive mail: an MX that isn't a null MX (RFC 7505), or else an A/AAAA
 * record (RFC 5321's implicit MX). Only a definitive answer is `undeliverable`.
 */
export async function checkMailDomain(
  domain: string,
  dns: MailDnsResolver,
): Promise<MailDomainVerdict> {
  const mx = await answers(() => dns.resolveMx(domain));
  if (mx === "nxdomain") return "undeliverable";
  if (mx === null) return "unknown";
  if (mx.length > 0) {
    const isNullMx = mx.every((record) => record.exchange === "" || record.exchange === ".");
    return isNullMx ? "undeliverable" : "deliverable";
  }
  const [a, aaaa] = await Promise.all([
    answers(() => dns.resolve4(domain)),
    answers(() => dns.resolve6(domain)),
  ]);
  if ((Array.isArray(a) && a.length > 0) || (Array.isArray(aaaa) && aaaa.length > 0)) {
    return "deliverable";
  }
  return a === null || aaaa === null ? "unknown" : "undeliverable";
}

/**
 * `checkMailDomain` with an in-process cache of definitive verdicts, so common domains cost no
 * lookup. Uses the system resolver (in AWS, the VPC's caching resolver), 1 s per query, no retry.
 */
export function cachedMailDomainCheck(
  opts: { dns?: MailDnsResolver; ttlMs?: number; maxEntries?: number; now?: () => number } = {},
): (domain: string) => Promise<MailDomainVerdict> {
  const dns = opts.dns ?? new Resolver({ timeout: 1000, tries: 1 });
  const ttlMs = opts.ttlMs ?? 10 * 60_000;
  const maxEntries = opts.maxEntries ?? 5000;
  const now = opts.now ?? Date.now;
  const cache = new Map<string, { verdict: MailDomainVerdict; expiresAt: number }>();
  return async (domain) => {
    const hit = cache.get(domain);
    if (hit && hit.expiresAt > now()) return hit.verdict;
    cache.delete(domain);
    const verdict = await checkMailDomain(domain, dns);
    if (verdict !== "unknown") {
      // Maps iterate in insertion order: evict the oldest entry.
      if (cache.size >= maxEntries) cache.delete(cache.keys().next().value as string);
      cache.set(domain, { verdict, expiresAt: now() + ttlMs });
    }
    return verdict;
  };
}

/** RFC 2606 / 6761 names: fine for local development, never real addresses. */
export const SPECIAL_USE_TLDS: ReadonlySet<string> = new Set([
  "test",
  "local",
  "localhost",
  "example",
  "invalid",
]);

/** `info@`, `admin@`, `noreply@`…: shared or system mailboxes rather than a person. */
export function isRoleAccount(email: string): boolean {
  const at = email.lastIndexOf("@");
  const local = (at < 0 ? email : email.slice(0, at)).trim().toLowerCase().split("+")[0] ?? "";
  return ROLE_LOCAL_PARTS.has(local);
}

/** A free consumer mailbox provider (gmail.com, outlook.com…) rather than an organization's domain. */
export function isFreeProvider(domain: string): boolean {
  return FREE_PROVIDER_DOMAINS.has(domain.toLowerCase().replace(/\.$/, ""));
}

/** Optimal string alignment distance (Levenshtein plus adjacent transpositions), capped. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previous2: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, (previous2[j - 2] ?? 0) + 1);
      }
      current.push(value);
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > max) return max + 1;
    previous2 = previous;
    previous = current;
  }
  return previous[b.length] ?? max + 1;
}

/** Second-level labels shorter than this (aol, msn, me, qq) only get top-level-domain fixes. */
const MIN_FUZZY_LABEL = 5;

/**
 * The popular mailbox domain `domain` is most likely a typo of (`gmial.com` → `gmail.com`,
 * `gmail.con` → `gmail.com`), or `null`. Known providers never get a suggestion; short provider
 * names only match when the typo is in the top-level domain, to spare real look-alike domains.
 */
export function suggestDomain(domain: string): string | null {
  const name = domain.toLowerCase().replace(/\.$/, "");
  if (!name.includes(".") || FREE_PROVIDER_DOMAINS.has(name) || POPULAR_DOMAINS.includes(name)) {
    return null;
  }
  const label = name.slice(0, name.indexOf("."));
  let best: { domain: string; distance: number } | null = null;
  for (const candidate of POPULAR_DOMAINS) {
    const candidateLabel = candidate.slice(0, candidate.indexOf("."));
    const fuzzy = candidateLabel.length >= MIN_FUZZY_LABEL;
    if (!fuzzy && candidateLabel !== label) continue;
    const distance = editDistance(name, candidate, 2);
    if (distance === 0 || distance > 2) continue;
    if (!best || distance < best.distance) best = { domain: candidate, distance };
  }
  return best?.domain ?? null;
}

/** Why `address` isn't a plausible mailbox address (`null` = it is). Domains are checked as ASCII. */
export function emailSyntaxProblem(address: string): string | null {
  if (address.length > 254) return "longer than 254 characters";
  // biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting control characters is the point
  if (/[\s\u0000-\u001f\u007f<>]/.test(address)) return "contains spaces or control characters";
  const at = address.lastIndexOf("@");
  if (at <= 0) return "has no local part";
  const local = address.slice(0, at);
  const domain = address.slice(at + 1);
  if (local.length > 64) return "local part longer than 64 characters";
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return "local part has misplaced dots";
  }
  const ascii = domainToASCII(domain.toLowerCase());
  if (!ascii || ascii.length > 253) return "invalid domain";
  const labels = ascii.split(".");
  if (labels.length < 2) return "domain has no top-level domain";
  const validLabel = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
  if (!labels.every((label) => validLabel.test(label))) return "invalid domain";
  if (/^\d+$/.test(labels.at(-1) ?? "")) return "invalid top-level domain";
  return null;
}

export type EmailAnalysis = {
  /** Trimmed, domain lower-cased and in ASCII (punycode). */
  address: string;
  /** The mailbox it delivers to (`canonicalEmail`). */
  canonical: string;
  domain: string;
  valid: boolean;
  problem: string | null;
  disposable: boolean;
  role: boolean;
  free: boolean;
  /** A popular domain this one looks like a typo of. */
  suggestion: string | null;
};

/** Every synchronous email signal at once (no DNS: see `checkMailDomain`). */
export function analyzeEmail(input: string): EmailAnalysis {
  const trimmed = input.trim();
  const problem = emailSyntaxProblem(trimmed);
  const at = trimmed.lastIndexOf("@");
  const rawDomain = at < 0 ? "" : trimmed.slice(at + 1).toLowerCase();
  const domain = (rawDomain && domainToASCII(rawDomain)) || rawDomain;
  const address = at < 0 ? trimmed : `${trimmed.slice(0, at)}@${domain}`;
  const valid = problem === null;
  return {
    address,
    canonical: canonicalEmail(address),
    domain,
    valid,
    problem,
    disposable: valid && isDisposableDomain(domain),
    role: valid && isRoleAccount(address),
    free: valid && isFreeProvider(domain),
    suggestion: valid ? suggestDomain(domain) : null,
  };
}
