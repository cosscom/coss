import { AVATARS } from "./avatars.generated.ts";

/**
 * Every avatar is served by the hub itself from public/avatars (GitHub's by handle, Unsplash
 * portraits for people who aren't on GitHub), downloaded by scripts/fetch-avatars.ts; the CSP
 * allows no third-party image origin.
 */
export function avatarUrl(subject: {
  handle?: string;
  slug?: string;
  avatarUrl?: string;
}): string | null {
  const key = subject.handle ?? subject.slug;
  // Accounts' avatars are served by `/a/<handle>` (uploaded, or the provider's, proxied).
  if (subject.avatarUrl?.startsWith("/")) return subject.avatarUrl;
  return key ? (AVATARS[key] ?? null) : null;
}

export function initials(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
