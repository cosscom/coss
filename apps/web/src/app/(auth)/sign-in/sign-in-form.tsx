"use client";

import { Button } from "@coss/ui/components/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { FormError } from "@/components/form-error";
import { authClient } from "@/lib/auth-client";

export function SignInForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    // With a callbackURL, Better Auth's client navigates there (full page load) on success.
    const { error } = await authClient.signIn.email({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      callbackURL: next,
    });
    if (error) {
      setError(error.message ?? "Could not sign in.");
      setPending(false);
    }
  }

  const query = next === "/" ? "" : `?next=${encodeURIComponent(next)}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in to COSS</CardTitle>
        <CardDescription>Use your email and password.</CardDescription>
      </CardHeader>
      <CardPanel>
        {/* method="post": a submit before hydration must never put credentials in the URL. */}
        <form className="flex flex-col gap-4" method="post" onSubmit={onSubmit}>
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input autoComplete="email" name="email" required type="email" />
          </Field>
          <Field>
            <div className="flex w-full items-center justify-between gap-2">
              <FieldLabel>Password</FieldLabel>
              <Link
                className="text-muted-foreground text-sm underline hover:text-foreground"
                href={`/forgot-password${query}`}
              >
                Forgot password?
              </Link>
            </div>
            <Input autoComplete="current-password" name="password" required type="password" />
          </Field>
          <FormError message={error} />
          <Button loading={pending} type="submit">
            Sign in
          </Button>
          <p className="text-center text-muted-foreground text-sm">
            No account?{" "}
            <Link className="text-foreground underline" href={`/sign-up${query}`}>
              Sign up
            </Link>
          </p>
        </form>
      </CardPanel>
    </Card>
  );
}
