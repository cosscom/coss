import type { Metadata } from "next";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

/** Public; also reachable while signed in (there is no change-password page yet). */
export default async function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  const next = safeRedirectPath((await searchParams).next);
  return <ForgotPasswordForm next={next} />;
}
