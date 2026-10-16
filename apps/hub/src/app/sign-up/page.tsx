import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth/auth-frame";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { env } from "@/env";
import { safeNext } from "@/lib/safe-next";
import { currentViewer } from "@/lib/session";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const next = safeNext((await searchParams).next);
  const viewer = await currentViewer();
  if (viewer) redirect(viewer.onboarded ? next : `/onboarding?next=${encodeURIComponent(next)}`);
  return (
    <AuthFrame
      footer={
        <>
          Already have an account?{" "}
          <Link
            className="text-foreground underline underline-offset-4"
            href={`/sign-in?next=${encodeURIComponent(next)}`}
          >
            Sign in
          </Link>
        </>
      }
      lede="Contribute in English, not code. One account for every project on the hub."
      title="Create your hub account"
    >
      <CredentialsForm github={Boolean(env.HUB_GITHUB_CLIENT_ID)} mode="sign-up" next={next} />
    </AuthFrame>
  );
}
