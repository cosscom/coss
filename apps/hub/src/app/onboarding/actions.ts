"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { handleProblem, isHandleTaken, saveProfile } from "@/lib/profiles";
import { safeNext } from "@/lib/safe-next";
import { currentViewer } from "@/lib/session";

export type OnboardingResult = { error: string; field?: string } | null;

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ROLES = new Set(["contributor", "maintainer"]);

const text = (form: FormData, key: string, max = 200) =>
  String(form.get(key) ?? "")
    .trim()
    .slice(0, max);

export async function completeOnboarding(
  _prev: OnboardingResult,
  form: FormData,
): Promise<OnboardingResult> {
  const viewer = await currentViewer();
  if (!viewer) return { error: "Sign in first." };

  const handle = text(form, "handle", 39).toLowerCase();
  const problem = handleProblem(handle);
  if (problem) return { error: problem, field: "handle" };
  if (await isHandleTaken(handle, viewer.accountId))
    return { error: "That handle is taken.", field: "handle" };

  const displayName = text(form, "displayName", 80);
  if (displayName.length < 2) return { error: "Tell us what to call you.", field: "displayName" };

  const website = text(form, "website");
  if (website && !/^https?:\/\/\S+$/.test(website))
    return { error: "A full URL, starting with https://", field: "website" };

  const role = text(form, "role");
  if (!ROLES.has(role)) return { error: "Pick one.", field: "role" };

  let avatar: { bytes: Buffer; type: string } | null = null;
  const file = form.get("avatar");
  if (file instanceof File && file.size > 0) {
    if (!AVATAR_TYPES.has(file.type))
      return { error: "A JPEG, PNG, WebP or GIF.", field: "avatar" };
    if (file.size > AVATAR_MAX_BYTES) return { error: "2 MB at most.", field: "avatar" };
    avatar = { bytes: Buffer.from(await file.arrayBuffer()), type: file.type };
  }

  await saveProfile(viewer.accountId, {
    handle,
    displayName,
    bio: text(form, "bio", 400),
    company: text(form, "company"),
    location: text(form, "location"),
    website,
    role: role as "contributor" | "maintainer",
    builds: text(form, "builds", 400),
    factory: text(form, "factory"),
    avatar,
  });
  refresh();
  redirect(safeNext(text(form, "next", 500), `/${handle}`));
}
