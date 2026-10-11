"use client";

import { Button } from "@coss/ui/components/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { FormError } from "@/components/form-error";
import { authClient } from "@/lib/auth-client";
import { nextQuery } from "@/lib/safe-redirect";

export function SignUpForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    // `callbackURL` is where the emailed verification link lands after verifying.
    const { error } = await authClient.signUp.email({
      name: String(form.get("name") ?? "").trim(),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      callbackURL: next,
    });
    if (error) {
      setError(error.message ?? "Could not create the account.");
      setPending(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  const query = nextQuery(next);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your COSS account</CardTitle>
        <CardDescription>A verification link is logged to the web server console.</CardDescription>
      </CardHeader>
      <CardPanel>
        {/* method="post": a submit before hydration must never put credentials in the URL. */}
        <form className="flex flex-col gap-4" method="post" onSubmit={onSubmit}>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input autoComplete="name" name="name" required />
          </Field>
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input autoComplete="email" name="email" required type="email" />
          </Field>
          <Field>
            <FieldLabel>Password</FieldLabel>
            <Input
              autoComplete="new-password"
              maxLength={128}
              minLength={8}
              name="password"
              required
              type="password"
            />
            <FieldDescription>At least 8 characters.</FieldDescription>
          </Field>
          <FormError message={error} />
          <Button loading={pending} type="submit">
            Create account
          </Button>
          <p className="text-center text-muted-foreground text-sm">
            Already have an account?{" "}
            <Link className="text-foreground underline" href={`/sign-in${query}`}>
              Sign in
            </Link>
          </p>
        </form>
      </CardPanel>
    </Card>
  );
}
