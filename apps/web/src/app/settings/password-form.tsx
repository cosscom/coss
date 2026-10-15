"use client";

import { Button } from "@coss/ui/components/button";
import { Input } from "@coss/ui/components/input";
import { SettingsFooter, SettingsRow } from "@/components/settings";
import { useActionToast } from "@/lib/toast";
import { changePasswordAction, setPasswordAction } from "./actions";

/** A password input on the right of its row (the row's label names it). */
function PasswordInput(props: {
  id: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  disabled: boolean;
  /** New passwords: at least 8 characters, like Better Auth's minimum. */
  isNew?: boolean;
}) {
  return (
    <Input
      autoComplete={props.autoComplete}
      className="sm:w-72"
      disabled={props.disabled}
      id={props.id}
      maxLength={128}
      minLength={props.isNew ? 8 : undefined}
      name={props.name}
      required
      type="password"
    />
  );
}

export function PasswordForm({ disabled }: { disabled: boolean }) {
  const [state, formAction, pending] = useActionToast(changePasswordAction, {
    success: { title: "Password changed", description: "Your other sessions were signed out." },
  });

  return (
    <form action={formAction}>
      {/* Lets password managers attach the new password to this account. */}
      <input autoComplete="username" hidden readOnly />
      <SettingsRow label={<label htmlFor="current-password">Current password</label>}>
        <PasswordInput
          autoComplete="current-password"
          disabled={disabled}
          id="current-password"
          name="currentPassword"
        />
      </SettingsRow>
      <SettingsRow
        description="At least 8 characters."
        label={<label htmlFor="new-password">New password</label>}
      >
        <PasswordInput
          autoComplete="new-password"
          disabled={disabled}
          id="new-password"
          isNew
          name="newPassword"
        />
      </SettingsRow>
      <SettingsRow label={<label htmlFor="confirm-password">Confirm new password</label>}>
        <PasswordInput
          autoComplete="new-password"
          disabled={disabled}
          id="confirm-password"
          isNew
          name="confirmPassword"
        />
      </SettingsRow>
      <SettingsFooter
        hint={
          state && !state.ok ? (
            <span className="text-destructive-foreground">{state.error}</span>
          ) : (
            "Changing it signs out every other session."
          )
        }
      >
        <Button disabled={disabled} loading={pending} size="sm" type="submit">
          Change password
        </Button>
      </SettingsFooter>
    </form>
  );
}

/** For accounts created with Google or GitHub, which have no password yet. */
export function SetPasswordForm({ disabled }: { disabled: boolean }) {
  const [state, formAction, pending] = useActionToast(setPasswordAction, {
    success: "Password set",
  });

  return (
    <form action={formAction}>
      {/* Lets password managers attach the new password to this account. */}
      <input autoComplete="username" hidden readOnly />
      <SettingsRow
        description="At least 8 characters."
        label={<label htmlFor="new-password">Password</label>}
      >
        <PasswordInput
          autoComplete="new-password"
          disabled={disabled}
          id="new-password"
          isNew
          name="newPassword"
        />
      </SettingsRow>
      <SettingsRow label={<label htmlFor="confirm-password">Confirm password</label>}>
        <PasswordInput
          autoComplete="new-password"
          disabled={disabled}
          id="confirm-password"
          isNew
          name="confirmPassword"
        />
      </SettingsRow>
      <SettingsFooter
        hint={
          state && !state.ok ? (
            <span className="text-destructive-foreground">{state.error}</span>
          ) : null
        }
      >
        <Button disabled={disabled} loading={pending} size="sm" type="submit">
          Set password
        </Button>
      </SettingsFooter>
    </form>
  );
}
