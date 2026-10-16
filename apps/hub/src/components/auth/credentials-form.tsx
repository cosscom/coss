"use client";

import { Button } from "@coss/ui/components/button";
import { Input } from "@coss/ui/components/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { GitHubMark } from "./github-mark";

/** Sign in or sign up with email and password, or GitHub when the hub has it configured. */
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
      {github && (
        <>
          <Button
            className="gap-2"
            disabled={pending}
            onClick={() => authClient.signIn.social({ provider: "github", callbackURL: after })}
            size="lg"
          >
            <GitHubMark className="size-4" />
            {mode === "sign-up" ? "Sign up" : "Sign in"} with GitHub
          </Button>
          <div className="flex items-center gap-3 text-muted-foreground text-xs">
            <span className="h-px flex-1 bg-border" />
            or with email
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}
      <form className="flex flex-col gap-3" onSubmit={submit}>
        {mode === "sign-up" && (
          <Input aria-label="Name" autoComplete="name" name="name" placeholder="Your name" />
        )}
        <Input
          aria-label="Email"
          autoComplete="email"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
        <Input
          aria-label="Password"
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          minLength={8}
          name="password"
          placeholder={mode === "sign-up" ? "A password, 8 characters or more" : "Password"}
          required
          type="password"
        />
        {error && (
          <p className="text-destructive-foreground text-sm" role="alert">
            {error}
          </p>
        )}
        <Button disabled={pending} size="lg" type="submit">
          {pending ? "One moment…" : mode === "sign-up" ? "Create account" : "Sign in"}
        </Button>
      </form>
      <p className="text-center text-muted-foreground text-sm">
        {mode === "sign-up" ? (
          <>
            Already have an account?{" "}
            <Link
              className="text-foreground underline underline-offset-4"
              href={`/sign-in?next=${encodeURIComponent(next)}`}
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link
              className="text-foreground underline underline-offset-4"
              href={`/sign-up?next=${encodeURIComponent(next)}`}
            >
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
