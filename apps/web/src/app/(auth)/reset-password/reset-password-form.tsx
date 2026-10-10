"use client";

import { Button } from "@coss/ui/components/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { FormError } from "@/components/form-error";
import { authClient } from "@/lib/auth-client";
import { nextQuery } from "@/lib/safe-redirect";

export function ResetPasswordForm({ token, next }: { token: string; next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(false);

  const query = nextQuery(next);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("password") ?? "");
    if (newPassword !== String(form.get("confirmPassword") ?? "")) {
      setError("The passwords don't match.");
      return;
    }
    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword, token });
    setPending(false);
    if (error) {
      const invalid = error.code === "INVALID_TOKEN";
      setTokenInvalid(invalid);
      setError(
        invalid
          ? "This reset link is invalid or has already been used. Request a new one."
          : (error.message ?? "Could not reset the password."),
      );
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Password updated</CardTitle>
          <CardDescription>
            You've been signed out everywhere. Sign in with your new password.
          </CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-3">
          <Button render={<Link href={`/sign-in${query}`} />}>Sign in</Button>
        </CardPanel>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>Every signed-in session will be signed out.</CardDescription>
      </CardHeader>
      <CardPanel>
        {/* method="post": a submit before hydration must never put passwords in the URL. */}
        <form className="flex flex-col gap-4" method="post" onSubmit={onSubmit}>
          <Field>
            <FieldLabel>New password</FieldLabel>
            <Input
              autoComplete="new-password"
              autoFocus
              maxLength={128}
              minLength={8}
              name="password"
              required
              type="password"
            />
            <FieldDescription>At least 8 characters.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Confirm new password</FieldLabel>
            <Input
              autoComplete="new-password"
              maxLength={128}
              minLength={8}
              name="confirmPassword"
              required
              type="password"
            />
          </Field>
          <FormError message={error} />
          <Button loading={pending} type="submit">
            Update password
          </Button>
          {tokenInvalid ? (
            <p className="text-center text-muted-foreground text-sm">
              <Link className="text-foreground underline" href={`/forgot-password${query}`}>
                Request a new reset link
              </Link>
            </p>
          ) : null}
        </form>
      </CardPanel>
    </Card>
  );
}
