/**
 * Sign-up email rules (abuse prevention): disposable domains, domains that can't receive mail, and
 * one account per mailbox (`canonicalEmail`). Server-only (DNS); no database access — the duplicate
 * check lives in `options.ts`. Applied to `/sign-up/email` (and invitee addresses), never to users
 * created server-side (test fixtures, the seed, admins, SSO).
 */
import { Resolver } from "node:dns/promises";
import { DISPOSABLE_DOMAINS } from "./disposable-domains.generated.ts";
import { emailDomainOf } from "./sso.ts";

/** Listed upstream but allowed here (an upstream false positive): keep each with a reason. */
const ALLOWED_DOMAINS: ReadonlySet<string> = new Set<string>([]);
/** Seen in abuse of COSS but not (yet) in the upstream list. */
const EXTRA_DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set<string>([]);

let disposable: ReadonlySet<string> | undefined;

/** True when `domain` or any parent domain (`x.mailinator.com`) is a disposable-mail domain. */
export function isDisposableDomain(domain: string): boolean {
  disposable ??= new Set([
    ...DISPOSABLE_DOMAINS.split("\n").filter(Boolean),
    ...EXTRA_DISPOSABLE_DOMAINS,
  ]);
  const labels = domain.toLowerCase().replace(/\.$/, "").split(".");
  for (let i = 0; i < labels.length - 1; i++) {
    const candidate = labels.slice(i).join(".");
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
 * migration of `user.canonical_email` — change both together.
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
const SPECIAL_USE_TLDS: ReadonlySet<string> = new Set([
  "test",
  "local",
  "localhost",
  "example",
  "invalid",
]);

export type EmailRejection = { code: string; message: string };

export const DISPOSABLE_EMAIL: EmailRejection = {
  code: "DISPOSABLE_EMAIL",
  message: "Disposable email addresses can't be used. Use a permanent address.",
};

/**
 * Why a new account can't use `email` (`null` = it can): a disposable domain, or (DNS) a domain
 * that can't receive mail. Special-use TLDs skip DNS outside production and are refused in it.
 */
export async function signUpEmailRejection(
  email: string,
  opts: { checkDomain: (domain: string) => Promise<MailDomainVerdict>; production: boolean },
): Promise<EmailRejection | null> {
  const domain = emailDomainOf(email)?.replace(/\.$/, "");
  if (!domain) return null; // Better Auth rejects malformed addresses itself.
  if (isDisposableDomain(domain)) return DISPOSABLE_EMAIL;
  const tld = domain.slice(domain.lastIndexOf(".") + 1);
  const verdict = SPECIAL_USE_TLDS.has(tld)
    ? opts.production
      ? "undeliverable"
      : "deliverable"
    : await opts.checkDomain(domain);
  if (verdict !== "undeliverable") return null;
  return {
    code: "EMAIL_DOMAIN_UNDELIVERABLE",
    message: `${domain} can't receive email. Check the address for typos.`,
  };
}
