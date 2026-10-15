/**
 * Which mailbox provider an address belongs to, by its domain alone (no DNS): consumer domains
 * of the large providers. Company domains hosted by Google Workspace or Microsoft 365 are `other`.
 */
import type { MailboxProvider } from "./schemas.ts";

// Maps, not objects: a domain like `constructor.fr` must not find `Object.prototype`'s keys.
const EXACT = new Map<string, MailboxProvider>();

function add(provider: MailboxProvider, domains: string[]): void {
  for (const domain of domains) EXACT.set(domain, provider);
}

add("gmail", ["gmail.com", "googlemail.com"]);
add("outlook", ["outlook.com", "hotmail.com", "live.com", "msn.com", "passport.com"]);
add("yahoo", ["yahoo.com", "ymail.com", "rocketmail.com", "aol.com", "aim.com"]);
add("icloud", ["icloud.com", "me.com", "mac.com"]);
add("proton", ["proton.me", "protonmail.com", "protonmail.ch", "pm.me"]);
add("gmx", ["gmx.com", "gmx.net", "gmx.de", "gmx.at", "gmx.ch", "web.de"]);
add("yandex", ["yandex.ru", "yandex.com", "ya.ru"]);
add("zoho", ["zoho.com", "zohomail.com"]);
add("fastmail", ["fastmail.com", "fastmail.fm"]);
add("mail_ru", ["mail.ru", "inbox.ru", "list.ru", "bk.ru"]);

/** Providers with a domain per country (`hotmail.co.uk`, `yahoo.fr`, `outlook.de`…). */
const BY_LABEL = new Map<string, MailboxProvider>([
  ["outlook", "outlook"],
  ["hotmail", "outlook"],
  ["live", "outlook"],
  ["yahoo", "yahoo"],
  ["gmx", "gmx"],
  ["yandex", "yandex"],
]);

// `co.uk`, `com.br`, `fr`: a country code, optionally after a generic second level.
const COUNTRY_SUFFIX = /^(?:(?:co|com|net|org)\.)?[a-z]{2}$/;

/** The provider of a (lower-case) address or domain; `other` when it isn't a known one. */
export function mailboxProviderOf(addressOrDomain: string): MailboxProvider {
  const domain = addressOrDomain.slice(addressOrDomain.lastIndexOf("@") + 1).toLowerCase();
  const exact = EXACT.get(domain);
  if (exact) return exact;
  const dot = domain.indexOf(".");
  if (dot < 0) return "other";
  const label = BY_LABEL.get(domain.slice(0, dot));
  return label && COUNTRY_SUFFIX.test(domain.slice(dot + 1)) ? label : "other";
}
