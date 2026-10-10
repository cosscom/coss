import { Button } from "@coss/ui/components/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import type { Metadata } from "next";
import Link from "next/link";
import { nextQuery, safeRedirectPath } from "@/lib/safe-redirect";
import { ResetPasswordForm } from "./reset-password-form";

// The URL carries the reset token: never leak it to other origins through the Referer header.
export const metadata: Metadata = { title: "Reset password", referrer: "no-referrer" };

/**
 * Landing page of the emailed reset link. Better Auth's /api/auth/reset-password/:token checks the
 * token first and redirects here with `?token=…`, or with `?error=INVALID_TOKEN` when it is unknown
 * or expired. The token is single-use and is only checked again when the form is submitted.
 */
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token, error, next: rawNext } = await searchParams;
  const next = safeRedirectPath(rawNext);
  const query = nextQuery(next);

  if (typeof token !== "string" || token.length === 0 || error !== undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reset link invalid or expired</CardTitle>
          <CardDescription>
            Reset links can be used once and expire after one hour. Request a new one.
          </CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-3">
          <Button render={<Link href={`/forgot-password${query}`} />}>Request a new link</Button>
          <Button render={<Link href={`/sign-in${query}`} />} variant="outline">
            Back to sign in
          </Button>
        </CardPanel>
      </Card>
    );
  }

  return <ResetPasswordForm next={next} token={token} />;
}
