import "server-only";
import { createHash } from "node:crypto";

/**
 * Profile pictures: the one Google or GitHub gave the account (`user.image`, set at sign-up or
 * when one is linked), else the address's Gravatar, else the avatar's initials (Gravatar answers
 * 404 for addresses it doesn't know, and the avatar falls back).
 *
 * Only these hosts' pictures are shown: `user.image` can also come from an organization's SSO
 * identity provider, which could make every member viewing the members page load its URL.
 */
const PICTURE_HOSTS = [/^[a-z0-9-]+\.googleusercontent\.com$/, /^avatars\.githubusercontent\.com$/];

/** Requested width in pixels: twice the largest avatar the dashboard draws. */
const SIZE = 96;

export type AvatarUser = { email: string; emailVerified: boolean; image?: string | null };

export function avatarUrl(user: AvatarUser): string | null {
  return providerPicture(user.image) ?? (user.emailVerified ? gravatarUrl(user.email) : null);
}

/** Where `avatarUrl`'s picture comes from, for the account settings page. */
export function avatarSource(user: AvatarUser): "google" | "github" | "gravatar" | null {
  const picture = providerPicture(user.image);
  if (picture) {
    return new URL(picture).hostname === "avatars.githubusercontent.com" ? "github" : "google";
  }
  return user.emailVerified ? "gravatar" : null;
}

function providerPicture(image: string | null | undefined): string | null {
  if (!image) return null;
  let url: URL;
  try {
    url = new URL(image);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !PICTURE_HOSTS.some((host) => host.test(url.hostname))) {
    return null;
  }
  return url.href;
}

/**
 * Gravatar's SHA-256 form of the trimmed, lowercased address. Only for verified addresses: an
 * unverified one may belong to someone else, whose picture it would show.
 */
export function gravatarUrl(email: string): string {
  const hash = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  return `https://gravatar.com/avatar/${hash}?s=${SIZE}&d=404`;
}
