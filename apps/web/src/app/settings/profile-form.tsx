"use client";

import { Button } from "@coss/ui/components/button";
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import { FormError } from "@/components/form-error";
import { useActionToast } from "@/lib/toast";
import { sendVerificationEmailAction, updateNameAction } from "./actions";

export function ProfileForm(props: { name: string; disabled: boolean }) {
  const [state, formAction, pending] = useActionToast(updateNameAction, {
    success: "Name updated",
  });

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field className="min-w-64 flex-1">
          {/* The settings row names the field. */}
          <FieldLabel className="sr-only">Name</FieldLabel>
          <Input
            autoComplete="name"
            defaultValue={props.name}
            disabled={props.disabled}
            maxLength={64}
            name="name"
            required
          />
        </Field>
        <Button disabled={props.disabled} loading={pending} type="submit">
          Save
        </Button>
      </div>
      <FormError message={state?.ok ? null : state?.error} />
    </form>
  );
}

export function SendVerificationEmailButton({ disabled }: { disabled: boolean }) {
  const [state, formAction, pending] = useActionToast(sendVerificationEmailAction, {
    success: { title: "Verification email sent", description: "Check your inbox for the link." },
  });

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div>
        <Button
          disabled={disabled || state?.ok}
          loading={pending}
          size="sm"
          type="submit"
          variant="outline"
        >
          {state?.ok ? "Verification email sent" : "Send verification email"}
        </Button>
      </div>
      {state && !state.ok ? <FormError message={state.error} /> : null}
    </form>
  );
}
