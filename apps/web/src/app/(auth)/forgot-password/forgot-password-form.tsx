"use client";

import { Button } from "@coss/ui/components/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { FormError } from "@/components/form-error";
import { useTurnstile } from "@/components/turnstile";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { nextQuery } from "@/lib/safe-redirect";

export function ForgotPasswordForm({
  next,
  turnstileSiteKey,
}: {
  next: string;
  turnstileSiteKey: string | null;
}) {
  const turnstile = useTurnstile(turnstileSiteKey, "password-reset");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const query = nextQuery(next);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    setPending(true);
    setError(null);
    // Better Auth answers the same way whether or not the account exists. The emailed link checks
    // the token, then lands on `redirectTo` with `?token=…` (or `?error=INVALID_TOKEN`).
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `/reset-password${query}`,
      fetchOptions: { headers: turnstile.headers },
    });
    turnstile.reset();
    setPending(false);
    if (error) setError(authErrorMessage(error, "Could not send the reset link."));
    else setSentTo(email);
  }

  if (sentTo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            If an account exists for {sentTo}, we sent it a link to reset the password. The link
            expires in one hour. In development it is logged to the web server console.
          </CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-3">
          <Button render={<Link href={`/sign-in${query}`} />} variant="outline">
            Back to sign in
          </Button>
        </CardPanel>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>Enter your email and we'll send you a reset link.</CardDescription>
      </CardHeader>
      <CardPanel>
        {/* method="post": a submit before hydration must never put the email in the URL. */}
        <form className="flex flex-col gap-4" method="post" onSubmit={onSubmit}>
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input autoComplete="email" autoFocus name="email" required type="email" />
          </Field>
          {turnstile.widget}
          <FormError message={error ?? turnstile.error} />
          <Button disabled={!turnstile.ready} loading={pending} type="submit">
            Send reset link
          </Button>
          <p className="text-center text-muted-foreground text-sm">
            Remembered it?{" "}
            <Link className="text-foreground underline" href={`/sign-in${query}`}>
              Sign in
            </Link>
          </p>
        </form>
      </CardPanel>
    </Card>
  );
}
