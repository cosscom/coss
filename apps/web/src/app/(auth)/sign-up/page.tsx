import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { env } from "@/env";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getSession } from "@/lib/session";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const next = safeRedirectPath((await searchParams).next);
  if (await getSession()) redirect(next);
  return <SignUpForm next={next} turnstileSiteKey={env.TURNSTILE_SITE_KEY ?? null} />;
}
