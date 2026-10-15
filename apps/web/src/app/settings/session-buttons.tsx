"use client";

import { Button } from "@coss/ui/components/button";
import { useActionToast } from "@/lib/toast";
import { revokeOtherSessionsAction, revokeSessionAction } from "./actions";

export function RevokeSessionButton(props: { sessionId: string; disabled: boolean }) {
  const [, formAction, pending] = useActionToast(revokeSessionAction, {
    success: "Session signed out",
    errors: "toast",
  });

  return (
    <form action={formAction}>
      <input name="sessionId" type="hidden" value={props.sessionId} />
      <Button disabled={props.disabled} loading={pending} size="sm" type="submit" variant="outline">
        Sign out
      </Button>
    </form>
  );
}

export function RevokeOtherSessionsButton({ disabled }: { disabled: boolean }) {
  const [, formAction, pending] = useActionToast(revokeOtherSessionsAction, {
    success: "Other sessions signed out",
    errors: "toast",
  });

  return (
    <form action={formAction}>
      <Button disabled={disabled} loading={pending} size="sm" type="submit" variant="outline">
        Sign out other sessions
      </Button>
    </form>
  );
}
