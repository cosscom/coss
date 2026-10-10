"use client";

import { Button } from "@coss/ui/components/button";
import { useActionState } from "react";
import { revokeOtherSessionsAction, revokeSessionAction } from "./actions";

export function RevokeSessionButton(props: { sessionId: string; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(revokeSessionAction, null);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input name="sessionId" type="hidden" value={props.sessionId} />
      {state && !state.ok ? (
        <span className="text-destructive-foreground text-xs">{state.error}</span>
      ) : null}
      <Button
        disabled={props.disabled}
        loading={pending}
        size="xs"
        type="submit"
        variant="destructive-outline"
      >
        Sign out
      </Button>
    </form>
  );
}

export function RevokeOtherSessionsButton({ disabled }: { disabled: boolean }) {
  const [state, formAction, pending] = useActionState(revokeOtherSessionsAction, null);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      {state && !state.ok ? (
        <span className="text-destructive-foreground text-xs">{state.error}</span>
      ) : null}
      <Button disabled={disabled} loading={pending} size="sm" type="submit" variant="outline">
        Sign out other sessions
      </Button>
    </form>
  );
}
