"use client";

import { Switch } from "@coss/ui/components/switch";
import type { ReactNode } from "react";
import { useActionState, useRef } from "react";
import type { ActionResult } from "@/lib/action-result";
import { SettingsRow } from "./settings";

/**
 * A settings row whose switch saves on change: it posts `orgSlug` and `required` (the new value)
 * to `action`, and shows the action's error under the description.
 */
export function SettingsSwitchRow(props: {
  action: (previous: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  id: string;
  label: ReactNode;
  description: ReactNode;
  orgSlug: string;
  required: boolean;
  /** Every precondition for turning it on holds (the action re-checks them). */
  canTurnOn: boolean;
  /** Read-only members see the switch, disabled. */
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(props.action, null);
  const form = useRef<HTMLFormElement>(null);
  // While saving, show where the switch is going; the refreshed page then confirms it.
  const checked = pending ? !props.required : props.required;

  return (
    <form action={formAction} ref={form}>
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      <input name="required" type="hidden" value={String(!props.required)} />
      <SettingsRow
        description={
          <>
            {props.description}
            {state && !state.ok ? (
              <span className="mt-1 block text-destructive-foreground">{state.error}</span>
            ) : null}
          </>
        }
        label={<label htmlFor={props.id}>{props.label}</label>}
      >
        <Switch
          checked={checked}
          disabled={props.disabled || pending || (!props.required && !props.canTurnOn)}
          id={props.id}
          onCheckedChange={() => form.current?.requestSubmit()}
        />
      </SettingsRow>
    </form>
  );
}
