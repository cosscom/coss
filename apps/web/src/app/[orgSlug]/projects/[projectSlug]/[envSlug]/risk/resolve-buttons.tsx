"use client";

import { Button } from "@coss/ui/components/button";
import { useActionState } from "react";
import { recordRiskFeedbackAction } from "./actions";

/** One-click review resolution in the queue (the detail page also takes a note). */
export function ResolveButtons(props: {
  orgSlug: string;
  projectSlug: string;
  envSlug: string;
  assessmentId: string;
}) {
  const [state, formAction, pending] = useActionState(recordRiskFeedbackAction, null);
  return (
    <form action={formAction} className="flex items-center gap-1">
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      <input name="projectSlug" type="hidden" value={props.projectSlug} />
      <input name="envSlug" type="hidden" value={props.envSlug} />
      <input name="assessmentId" type="hidden" value={props.assessmentId} />
      <Button
        disabled={pending}
        name="outcome"
        size="xs"
        type="submit"
        value="legitimate"
        variant="outline"
      >
        Approve
      </Button>
      <Button
        disabled={pending}
        name="outcome"
        size="xs"
        type="submit"
        value="fraud"
        variant="destructive-outline"
      >
        Fraud
      </Button>
      {state && !state.ok ? (
        <span className="text-destructive-foreground text-xs">{state.error}</span>
      ) : null}
    </form>
  );
}
