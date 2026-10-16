import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth/auth-frame";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { getProfile } from "@/lib/profiles";
import { safeNext } from "@/lib/safe-next";
import { currentViewer } from "@/lib/session";

export const metadata: Metadata = { title: "Set up your profile" };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const next = safeNext((await searchParams).next, "");
  const viewer = await currentViewer();
  if (!viewer) redirect(`/sign-in?next=${encodeURIComponent("/onboarding")}`);
  const profile = await getProfile(viewer.accountId);
  const suggested =
    profile?.handle ??
    viewer.email
      .split("@")[0]
      ?.toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 39) ??
    "";
  return (
    <AuthFrame
      footer="Everything here can be changed later from your account menu."
      lede={
        profile?.onboardedAt
          ? "Change what the hub shows under your name."
          : "A few questions. Your profile is where your prompts to production end up."
      }
      title={profile?.onboardedAt ? "Your profile" : "Set up your profile"}
      wide
    >
      <OnboardingForm
        initial={{
          handle: suggested,
          displayName: profile?.displayName ?? viewer.user.name,
          bio: profile?.bio ?? "",
          company: profile?.company ?? "",
          location: profile?.location ?? "",
          website: profile?.website ?? "",
          role: (profile?.role as "contributor" | "maintainer" | undefined) ?? "contributor",
          builds: profile?.builds ?? "",
          factory: profile?.factory ?? "",
          avatarUrl: profile?.avatar ? `/a/${profile.handle}` : (viewer.user.avatarUrl ?? null),
        }}
        next={next}
      />
    </AuthFrame>
  );
}
