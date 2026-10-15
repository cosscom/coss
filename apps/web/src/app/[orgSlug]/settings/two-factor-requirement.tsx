"use client";

import { Button } from "@coss/ui/components/button";
import { FormError } from "@/components/form-error";
import { useActionToast } from "@/lib/toast";
import { setTwoFactorRequirementAction } from "./actions";

/** Turns the organization's two-factor requirement on or off. */
export function TwoFactorRequirementForm(props: {
  orgSlug: string;
  required: boolean;
  /** The actor has two-factor themselves (needed to turn the requirement on). */
  canRequire: boolean;
}) {
  const [state, formAction, pending] = useActionToast(setTwoFactorRequirementAction, {
    success: props.required ? "Two-factor no longer required" : "Two-factor now required",
  });

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      <input name="required" type="hidden" value={String(!props.required)} />
      {state && !state.ok ? <FormError message={state.error} /> : null}
      <div>
        <Button
          disabled={!props.required && !props.canRequire}
          loading={pending}
          size="sm"
          type="submit"
          variant={props.required ? "outline" : "default"}
        >
          {props.required ? "Stop requiring two-factor" : "Require two-factor"}
        </Button>
      </div>
    </form>
  );
}
