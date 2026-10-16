import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth.ts";
import { getProfile, toUser } from "./profiles.ts";
import type { User } from "./types.ts";

export type Viewer = {
  user: User;
  accountId: string;
  email: string;
  /** Onboarding done: a handle and a display name chosen. */
  onboarded: boolean;
};

/** The signed-in account, mirrored into the store as a hub user; `null` when signed out. */
export async function currentViewer(): Promise<Viewer | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const profile = await getProfile(session.user.id);
  return {
    user: toUser(session.user, profile),
    accountId: session.user.id,
    email: session.user.email,
    onboarded: Boolean(profile?.onboardedAt),
  };
}

export async function currentUser(): Promise<User | null> {
  return (await currentViewer())?.user ?? null;
}

/** Signed in and onboarded, or sent to the right page. */
export async function requireViewer(next = "/"): Promise<Viewer> {
  const viewer = await currentViewer();
  if (!viewer) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  if (!viewer.onboarded) redirect(`/onboarding?next=${encodeURIComponent(next)}`);
  return viewer;
}
