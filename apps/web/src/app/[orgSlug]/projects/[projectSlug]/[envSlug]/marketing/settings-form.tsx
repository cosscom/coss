"use client";

import { Button } from "@coss/ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import { Textarea } from "@coss/ui/components/textarea";
import { useActionState } from "react";
import { FormError } from "@/components/form-error";
import { type MarketingFormTarget, TargetInputs } from "@/components/marketing";
import { saveMarketingSettingsAction } from "./actions";

export function MarketingSettingsForm(
  props: MarketingFormTarget & {
    displayName: string | null;
    mailingAddress: string | null;
    canEdit: boolean;
  },
) {
  const [state, formAction, pending] = useActionState(saveMarketingSettingsAction, null);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <TargetInputs {...props} />
      <Field>
        <FieldLabel>Sender name</FieldLabel>
        <Input
          defaultValue={props.displayName ?? ""}
          disabled={!props.canEdit}
          maxLength={200}
          name="displayName"
          placeholder="Your organization's name"
        />
        <FieldDescription>Shown in the preference center: “Emails from …”.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel>Postal address</FieldLabel>
        <Textarea
          defaultValue={props.mailingAddress ?? ""}
          disabled={!props.canEdit}
          maxLength={500}
          name="mailingAddress"
          placeholder={"Acme Inc.\n548 Market St\nSan Francisco, CA 94104, USA"}
          rows={4}
        />
        <FieldDescription>
          Every marketing email carries it in its footer (the CAN-SPAM Act requires a valid physical
          address). Marketing email can't be sent without one.
        </FieldDescription>
      </Field>
      {state?.ok ? <p className="text-muted-foreground text-sm">Saved.</p> : null}
      {state && !state.ok ? <FormError message={state.error} /> : null}
      {props.canEdit ? (
        <div>
          <Button loading={pending} type="submit">
            Save settings
          </Button>
        </div>
      ) : null}
    </form>
  );
}
