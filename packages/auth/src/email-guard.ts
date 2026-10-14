/**
 * Sign-up email rules (abuse prevention): disposable domains, domains that can't receive mail, and
 * one account per mailbox (`canonicalEmail`). The signals themselves live in `@coss/signals/email`
 * (shared with risk assessments); this module only decides what sign-up refuses. Server-only
 * (DNS); no database access — the duplicate check lives in `options.ts`. Applied to
 * `/sign-up/email` (and invitee addresses), never to users created server-side (test fixtures,
 * the seed, admins, SSO).
 */
import {
  emailDomainOf,
  isDisposableDomain,
  type MailDomainVerdict,
  SPECIAL_USE_TLDS,
} from "@coss/signals/email";

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
