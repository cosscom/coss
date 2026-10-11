"use client";

import { Button } from "@coss/ui/components/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import { Separator } from "@coss/ui/components/separator";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { FormError } from "@/components/form-error";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { nextQuery } from "@/lib/safe-redirect";
import { ssoErrorMessage } from "@/lib/sso-errors";

export function SsoForm(props: {
  next: string;
  org: string | null;
  error: string | null;
  signedInAs: string | null;
}) {
  const [error, setError] = useState<string | null>(ssoErrorMessage(props.error));
  const [pending, setPending] = useState<"email" | "org" | null>(null);

  async function start(target: { email: string } | { organizationSlug: string }) {
    setPending("email" in target ? "email" : "org");
    setError(null);
    // Failed sign-ins come back here with `?error=`, keeping where the user was going.
    const back = new URLSearchParams({ next: props.next });
    if (props.org) back.set("org", props.org);
    const { data, error } = await authClient.signIn.sso({
      ...target,
      callbackURL: props.next,
      errorCallbackURL: `/sso?${back}`,
    });
    if (data?.url) {
      window.location.assign(data.url);
      return;
    }
    setError(authErrorMessage(error, "Could not start single sign-on."));
    setPending(null);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    void start({ email });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in with SSO</CardTitle>
        <CardDescription>
          {props.org
            ? "This organization requires you to sign in through its identity provider."
            : "Sign in through your organization's identity provider."}
        </CardDescription>
      </CardHeader>
      <CardPanel className="flex flex-col gap-4">
        {props.signedInAs ? (
          <p className="text-muted-foreground text-sm">
            You're signed in as {props.signedInAs}. Signing in with SSO replaces this session.
          </p>
        ) : null}
        {props.org ? (
          <>
            <Button
              disabled={pending !== null}
              loading={pending === "org"}
              onClick={() => void start({ organizationSlug: props.org ?? "" })}
            >
              Continue with SSO
            </Button>
            <div className="flex items-center gap-3 text-muted-foreground text-xs">
              <Separator className="flex-1" />
              or use your work email
              <Separator className="flex-1" />
            </div>
          </>
        ) : null}
        <form className="flex flex-col gap-4" method="post" onSubmit={onSubmit}>
          <Field>
            <FieldLabel>Work email</FieldLabel>
            <Input autoComplete="username" name="email" required type="email" />
            <FieldDescription>We'll send you to your organization's sign-in page.</FieldDescription>
          </Field>
          <FormError message={error} />
          <Button
            disabled={pending !== null}
            loading={pending === "email"}
            type="submit"
            variant={props.org ? "outline" : "default"}
          >
            Continue
          </Button>
        </form>
        <p className="text-center text-muted-foreground text-sm">
          <Link className="text-foreground underline" href={`/sign-in${nextQuery(props.next)}`}>
            Sign in another way
          </Link>
        </p>
      </CardPanel>
    </Card>
  );
}
