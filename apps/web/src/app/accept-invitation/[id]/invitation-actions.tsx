"use client";

import { Button } from "@coss/ui/components/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/form-error";
import { authClient } from "@/lib/auth-client";

export function SendVerificationEmailButton(props: { email: string; callbackURL: string }) {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button
        disabled={sent}
        loading={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          const { error } = await authClient.sendVerificationEmail(props);
          setPending(false);
          if (error) setError(error.message ?? "Could not send the verification email.");
          else setSent(true);
        }}
      >
        {sent ? "Verification email sent" : "Send verification email"}
      </Button>
      {sent ? (
        <p className="text-muted-foreground text-sm">
          In development the link is logged to the web server console.
        </p>
      ) : null}
      <FormError message={error} />
    </>
  );
}

export function AcceptInvitationButton(props: { invitationId: string; organizationSlug: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button
        loading={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          const { error } = await authClient.organization.acceptInvitation({
            invitationId: props.invitationId,
          });
          if (error) {
            setError(error.message ?? "Could not accept the invitation.");
            setPending(false);
            return;
          }
          router.push(`/${props.organizationSlug}`);
          router.refresh();
        }}
      >
        Accept invitation
      </Button>
      <FormError message={error} />
    </>
  );
}
