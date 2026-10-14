"use client";

import { Button } from "@coss/ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import { useActionState } from "react";
import { FormError } from "@/components/form-error";
import { changePasswordAction, setPasswordAction } from "./actions";

export function PasswordForm({ disabled }: { disabled: boolean }) {
  const [state, formAction, pending] = useActionState(changePasswordAction, null);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      {/* Lets password managers attach the new password to this account. */}
      <input autoComplete="username" hidden readOnly />
      <Field>
        <FieldLabel>Current password</FieldLabel>
        <Input
          autoComplete="current-password"
          disabled={disabled}
          maxLength={128}
          name="currentPassword"
          required
          type="password"
        />
      </Field>
      <Field>
        <FieldLabel>New password</FieldLabel>
        <Input
          autoComplete="new-password"
          disabled={disabled}
          maxLength={128}
          minLength={8}
          name="newPassword"
          required
          type="password"
        />
        <FieldDescription>At least 8 characters.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel>Confirm new password</FieldLabel>
        <Input
          autoComplete="new-password"
          disabled={disabled}
          maxLength={128}
          minLength={8}
          name="confirmPassword"
          required
          type="password"
        />
      </Field>
      {state?.ok ? (
        <p className="text-muted-foreground text-sm">
          Password changed. Your other sessions were signed out.
        </p>
      ) : (
        <FormError message={state?.error} />
      )}
      <div>
        <Button disabled={disabled} loading={pending} type="submit">
          Change password
        </Button>
      </div>
    </form>
  );
}

/** For accounts created with Google or GitHub, which have no password yet. */
export function SetPasswordForm({ disabled }: { disabled: boolean }) {
  const [state, formAction, pending] = useActionState(setPasswordAction, null);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      {/* Lets password managers attach the new password to this account. */}
      <input autoComplete="username" hidden readOnly />
      <Field>
        <FieldLabel>Password</FieldLabel>
        <Input
          autoComplete="new-password"
          disabled={disabled}
          maxLength={128}
          minLength={8}
          name="newPassword"
          required
          type="password"
        />
        <FieldDescription>At least 8 characters.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel>Confirm password</FieldLabel>
        <Input
          autoComplete="new-password"
          disabled={disabled}
          maxLength={128}
          minLength={8}
          name="confirmPassword"
          required
          type="password"
        />
      </Field>
      <FormError message={state?.ok ? null : state?.error} />
      <div>
        <Button disabled={disabled} loading={pending} type="submit">
          Set password
        </Button>
      </div>
    </form>
  );
}
