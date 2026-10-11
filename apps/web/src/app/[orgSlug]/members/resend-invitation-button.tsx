"use client";

import { Button } from "@coss/ui/components/button";
import { useActionState } from "react";
import { resendInvitationAction } from "./actions";

/** Re-sends the invitation and extends its expiry; the result replaces the button's label. */
export function ResendInvitationButton(props: { orgSlug: string; invitationId: string }) {
  const [state, formAction, pending] = useActionState(resendInvitationAction, null);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      <input name="invitationId" type="hidden" value={props.invitationId} />
      {state && !state.ok ? (
        <span className="text-destructive-foreground text-xs">{state.error}</span>
      ) : null}
      <Button disabled={state?.ok} loading={pending} size="xs" type="submit" variant="outline">
        {state?.ok ? "Sent" : "Resend"}
      </Button>
    </form>
  );
}
