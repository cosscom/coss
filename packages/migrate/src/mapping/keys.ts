/**
 * Names coss.com requires that providers don't: contact property keys, topic keys (a send's
 * category) and template aliases. Each takes the names already used, so two source names that
 * normalize alike get distinct keys (`_2`, `_3`, …).
 */
import { CONTACT_PROPERTY_KEY, RESERVED_PROPERTY_KEYS } from "@coss/email/contact-schemas";
import { TEMPLATE_ALIAS } from "@coss/email/schemas";
import type { MigrationProvider } from "../types.ts";

function slug(value: string, separator: "_" | "-"): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`^\\${separator}+|\\${separator}+$`, "g"), "");
}

function unique(base: string, maxLength: number, taken: Set<string>): string {
  let candidate = base.slice(0, maxLength);
  for (let n = 2; taken.has(candidate); n++) {
    const suffix = `_${n}`;
    candidate = `${base.slice(0, maxLength - suffix.length)}${suffix}`;
  }
  taken.add(candidate);
  return candidate;
}

/** `^[a-z][a-z0-9_]{0,49}$`, never a built-in field (`email`, `first_name`, …). */
export function propertyKey(name: string, provider: MigrationProvider, taken: Set<string>): string {
  let key = slug(name, "_");
  if (!/^[a-z]/.test(key)) key = `p_${key}`;
  if (RESERVED_PROPERTY_KEYS.has(key)) key = `${provider}_${key}`;
  const result = unique(key === "p_" ? "property" : key, 50, taken);
  if (!CONTACT_PROPERTY_KEY.test(result)) throw new Error(`Bad property key ${result}`);
  return result;
}

/** A topic key: `[A-Za-z0-9_-]{1,256}`, lower-cased. */
export function topicKey(name: string, taken: Set<string>): string {
  return unique(slug(name, "_") || "topic", 64, taken);
}

/**
 * `^[a-z0-9][a-z0-9_-]{0,63}$`, not starting `etpl_`. The provider's own alias or id when it fits
 * (SendGrid's `d-…` ids, Postmark aliases): sends can keep naming the template the same way.
 */
export function templateAlias(preferred: string | null, name: string, taken: Set<string>): string {
  const own = preferred?.toLowerCase() ?? "";
  if (own && TEMPLATE_ALIAS.test(own) && !own.startsWith("etpl_") && !taken.has(own)) {
    taken.add(own);
    return own;
  }
  let base = slug(preferred ?? name, "-") || slug(name, "-") || "template";
  if (base.startsWith("etpl_")) base = `t-${base}`;
  return unique(base, 64, taken);
}
