import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { user as authUser, hubProfile } from "@/db/schema";
import { seed } from "./seed.ts";
import { getUser, upsertUser } from "./store.ts";
import type { User } from "./types.ts";

export type Profile = typeof hubProfile.$inferSelect;

/**
 * Handles nobody can take: the seeded organizations and the hub's own routes. A seeded person's
 * handle (peerrich, …) can be claimed: the account then is that person on the hub, with their
 * seeded history (prototype: first come, first served; a real hub would verify it with GitHub).
 */
const RESERVED = new Set<string>([
  ...seed().organizations.map((o) => o.slug.toLowerCase()),
  "a",
  "api",
  "attachments",
  "sign-in",
  "sign-up",
  "onboarding",
  "settings",
  "hub",
  "coss",
  "admin",
  "new",
  "prompts",
  "factory",
  "insights",
]);

export const HANDLE_RULE = /^[a-z0-9](?:[a-z0-9-]{1,37}[a-z0-9])?$/;

export function handleProblem(handle: string): string | null {
  const value = handle.trim().toLowerCase();
  if (!HANDLE_RULE.test(value)) {
    return "3 to 39 letters, digits or hyphens, starting and ending with a letter or digit.";
  }
  if (RESERVED.has(value)) return "That handle is taken.";
  return null;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const [row] = await db.select().from(hubProfile).where(eq(hubProfile.userId, userId)).limit(1);
  return row ?? null;
}

export async function getProfileByHandle(handle: string): Promise<Profile | null> {
  const [row] = await db
    .select()
    .from(hubProfile)
    .where(eq(hubProfile.handle, handle.toLowerCase()))
    .limit(1);
  return row ?? null;
}

export async function isHandleTaken(handle: string, exceptUserId?: string): Promise<boolean> {
  const row = await getProfileByHandle(handle);
  return Boolean(row && row.userId !== exceptUserId);
}

export type ProfileInput = {
  handle: string;
  displayName: string;
  bio?: string;
  company?: string;
  location?: string;
  website?: string;
  role: "contributor" | "maintainer";
  builds?: string;
  factory?: string;
  avatar?: { bytes: Buffer; type: string } | null;
};

export async function saveProfile(
  userId: string,
  input: ProfileInput,
  onboarded = true,
): Promise<Profile> {
  const values = {
    userId,
    handle: input.handle.trim().toLowerCase(),
    displayName: input.displayName.trim(),
    bio: input.bio?.trim() || null,
    company: input.company?.trim() || null,
    location: input.location?.trim() || null,
    website: input.website?.trim() || null,
    role: input.role,
    builds: input.builds?.trim() || null,
    factory: input.factory?.trim() || null,
    ...(input.avatar ? { avatar: input.avatar.bytes, avatarType: input.avatar.type } : {}),
    ...(onboarded ? { onboardedAt: new Date() } : {}),
  };
  const [row] = await db
    .insert(hubProfile)
    .values(values)
    .onConflictDoUpdate({ target: hubProfile.userId, set: values })
    .returning();
  if (!row) throw new Error("Profile not saved.");
  return row;
}

/** The store's view of an account: its profile, or a placeholder before onboarding. */
export function toUser(
  account: { id: string; name: string; email: string; image?: string | null; createdAt: Date },
  profile: Profile | null,
): User {
  const handle = profile?.handle ?? `user-${account.id.slice(-6).toLowerCase()}`;
  // A claimed seeded handle keeps that person's history (followers, contributions, GitHub
  // avatar unless one was uploaded); the profile's own fields win.
  const seeded = getUser(handle);
  const user: User = {
    ...seeded,
    handle,
    accountId: account.id,
    name: profile?.displayName ?? seeded?.name ?? account.name ?? account.email,
    bio: profile?.bio ?? seeded?.bio,
    company: profile?.company ?? seeded?.company,
    location: profile?.location ?? seeded?.location,
    website: profile?.website ?? seeded?.website,
    avatarUrl: profile?.avatar
      ? `/a/${handle}`
      : seeded?.githubHandle
        ? undefined
        : account.image
          ? `/a/${handle}`
          : undefined,
    followers: seeded?.followers ?? 0,
    following: seeded?.following ?? 0,
    joinedAt: seeded?.joinedAt ?? account.createdAt,
  };
  return upsertUser(user);
}

/** A real account by handle (profile pages of people this process hasn't seen sign in). */
export async function findUserByHandle(handle: string): Promise<User | null> {
  const [row] = await db
    .select({ profile: hubProfile, account: authUser })
    .from(hubProfile)
    .innerJoin(authUser, eq(authUser.id, hubProfile.userId))
    .where(eq(hubProfile.handle, handle.toLowerCase()))
    .limit(1);
  return row ? toUser(row.account, row.profile) : null;
}
