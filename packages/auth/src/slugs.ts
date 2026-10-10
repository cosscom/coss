/** Organization slug rules (client-safe). Org slugs are the first URL segment of the dashboard. */

export const RESERVED_ORG_SLUGS: ReadonlySet<string> = new Set([
  // Top-level dashboard routes
  "admin",
  "api",
  "onboarding",
  "sign-in",
  "sign-up",
  "sign-out",
  "accept-invitation",
  "verify-email",
  "forgot-password",
  "reset-password",
  "settings",
  "invite",
  "new",
  "docs",
  // Next.js metadata routes
  "icon",
  "apple-icon",
  "opengraph-image",
  "twitter-image",
  "sitemap",
  "robots",
  "manifest",
]);

export const ORG_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/;

/** Returns an error message, or `null` when the slug is valid. */
export function validateOrgSlug(slug: string): string | null {
  if (!ORG_SLUG_PATTERN.test(slug)) {
    return "Slug must be 3-48 characters: lowercase letters, numbers and dashes, not starting or ending with a dash.";
  }
  if (RESERVED_ORG_SLUGS.has(slug)) return `"${slug}" is reserved.`;
  return null;
}

/** "Acme, Inc." -> "acme-inc" */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}
