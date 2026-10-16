import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth/auth-frame";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { env } from "@/env";
import { safeNext } from "@/lib/safe-next";
import { currentViewer } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const next = safeNext((await searchParams).next);
  const viewer = await currentViewer();
  if (viewer) redirect(viewer.onboarded ? next : `/onboarding?next=${encodeURIComponent(next)}`);
  return (
    <AuthFrame
      footer={
        <>
          New here?{" "}
          <Link
            className="text-foreground underline underline-offset-4"
            href={`/sign-up?next=${encodeURIComponent(next)}`}
          >
            Create an account
          </Link>
        </>
      }
      lede="Your hub account: prompts, decisions and what shipped, under your name."
      title="Sign in"
    >
      <CredentialsForm github={Boolean(env.HUB_GITHUB_CLIENT_ID)} mode="sign-in" next={next} />
    </AuthFrame>
  );
}
