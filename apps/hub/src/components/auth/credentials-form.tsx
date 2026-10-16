"use client";

import { Button } from "@coss/ui/components/button";
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Form } from "@coss/ui/components/form";
import { Input } from "@coss/ui/components/input";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { GitHubMark } from "./github-mark";

/** GitHub first (sign-up migrates a GitHub identity), or email and password. */
export function CredentialsForm({
  mode,
  next,
  github,
}: {
  mode: "sign-in" | "sign-up";
  next: string;
  github: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const after = mode === "sign-up" ? `/onboarding?next=${encodeURIComponent(next)}` : next;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const result =
      mode === "sign-up"
        ? await authClient.signUp.email({
            name: String(form.get("name") ?? "").trim() || email,
            email,
            password,
          })
        : await authClient.signIn.email({ email, password });
    setPending(false);
    if (result.error) {
      setError(result.error.message ?? "That didn't work. Try again.");
      return;
    }
    router.push(after);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        className="gap-2"
        disabled={pending}
        onClick={() => {
          if (!github) {
            setError("GitHub sign-in isn't connected on this hub yet. Use email for now.");
            return;
          }
          authClient.signIn.social({ provider: "github", callbackURL: after });
        }}
        size="lg"
      >
        <GitHubMark className="size-4" />
        {mode === "sign-up" ? "Migrate from GitHub" : "Sign in with GitHub"}
      </Button>
      {mode === "sign-up" && (
        <p className="-mt-2 text-center font-mono text-muted-foreground text-xs">
          We import your profile, stars and contributions, too.
        </p>
      )}
      <div className="flex items-center gap-3 text-muted-foreground text-xs">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <Form className="flex w-full flex-col gap-4" onSubmit={submit}>
        {mode === "sign-up" && (
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input autoComplete="name" name="name" placeholder="Your name" />
          </Field>
        )}
        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input
            autoComplete="email"
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
        </Field>
        <Field>
          <FieldLabel>Password</FieldLabel>
          <Input
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            minLength={8}
            name="password"
            placeholder={mode === "sign-up" ? "8 characters or more" : "Your password"}
            required
            type="password"
          />
        </Field>
        {error && (
          <p className="text-destructive-foreground text-sm" role="alert">
            {error}
          </p>
        )}
        <Button className="w-full" disabled={pending} type="submit">
          {pending ? "One moment…" : mode === "sign-up" ? "Create account" : "Sign in"}
        </Button>
      </Form>
    </div>
  );
}
