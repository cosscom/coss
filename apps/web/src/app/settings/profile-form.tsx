"use client";

import { Button } from "@coss/ui/components/button";
import { Input } from "@coss/ui/components/input";
import { useActionState, useState } from "react";
import { FormError } from "@/components/form-error";
import { SettingsFooter, SettingsRow } from "@/components/settings";
import { sendVerificationEmailAction, updateNameAction } from "./actions";

/** The Profile section's name row, saved from the card's footer. */
export function ProfileForm(props: { name: string; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(updateNameAction, null);
  const [name, setName] = useState(props.name);
  const dirty = name !== props.name;

  return (
    <form action={formAction}>
      <SettingsRow
        description="Shown to the other members of your organizations."
        label={<label htmlFor="profile-name">Name</label>}
      >
        <Input
          autoComplete="name"
          className="sm:w-72"
          disabled={props.disabled}
          id="profile-name"
          maxLength={64}
          name="name"
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
      </SettingsRow>
      {props.disabled ? null : (
        <SettingsFooter
          hint={
            state && !state.ok ? (
              <span className="text-destructive-foreground">{state.error}</span>
            ) : state?.ok && !dirty ? (
              "Saved."
            ) : null
          }
        >
          <Button disabled={!dirty} loading={pending} size="sm" type="submit">
            Save
          </Button>
        </SettingsFooter>
      )}
    </form>
  );
}

export function SendVerificationEmailButton({ disabled }: { disabled: boolean }) {
  const [state, formAction, pending] = useActionState(sendVerificationEmailAction, null);

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <Button
        disabled={disabled || state?.ok}
        loading={pending}
        size="sm"
        type="submit"
        variant="outline"
      >
        {state?.ok ? "Verification email sent" : "Send verification email"}
      </Button>
      {state && !state.ok ? <FormError message={state.error} /> : null}
    </form>
  );
}
