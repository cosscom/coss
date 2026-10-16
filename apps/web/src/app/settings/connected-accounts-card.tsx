"use client";

import { SOCIAL_PROVIDER_LABELS, type SocialProvider } from "@coss/auth/constants";
import { Button } from "@coss/ui/components/button";
import { SettingsNote, SettingsRow, SettingsSection } from "@/components/settings";
import { ProviderIcon } from "@/components/social-sign-in";
import { StatusDot } from "@/components/status-dot";
import { useActionToast } from "@/lib/toast";
import { connectSocialAccountAction, disconnectSocialAccountAction } from "./actions";

export type ConnectedAccountRow = {
  provider: SocialProvider;
  connected: boolean;
  /** Configured for this deployment (a connected one that no longer is can still be removed). */
  available: boolean;
};

/** Google and GitHub accounts that sign in to this coss.com account. */
export function ConnectedAccountsCard(props: {
  rows: ConnectedAccountRow[];
  /** The only way to sign in left (no password, one provider): Better Auth keeps it. */
  lastSignInMethod: SocialProvider | null;
  /** A failed connection, from `?error=` (`socialErrorMessage`). */
  error: string | null;
  disabled: boolean;
}) {
  return (
    <SettingsSection
      description="Sign in with these accounts too. Their email addresses may differ from yours."
      title="Connected accounts"
    >
      {props.error ? (
        <SettingsNote className="text-destructive-foreground">{props.error}</SettingsNote>
      ) : null}
      {props.rows.map((row) => (
        <ConnectedAccount
          disabled={props.disabled}
          isLast={props.lastSignInMethod === row.provider}
          key={row.provider}
          row={row}
        />
      ))}
    </SettingsSection>
  );
}

function ConnectedAccount(props: { row: ConnectedAccountRow; isLast: boolean; disabled: boolean }) {
  const { provider, connected, available } = props.row;
  // Connecting leaves for the provider's sign-in page, so only disconnecting toasts.
  const [state, formAction, pending] = useActionToast(
    connected ? disconnectSocialAccountAction : connectSocialAccountAction,
    { success: connected ? `${SOCIAL_PROVIDER_LABELS[provider]} disconnected` : undefined },
  );
  return (
    <form action={formAction}>
      <input name="provider" type="hidden" value={provider} />
      <SettingsRow
        description={
          <>
            {connected
              ? props.isLast
                ? "Your only way to sign in. Set a password before disconnecting it."
                : "You can sign in with it."
              : "Connecting asks you to sign in to it."}
            {state && !state.ok ? (
              <span className="mt-1 block text-destructive-foreground">{state.error}</span>
            ) : null}
          </>
        }
        label={
          <>
            <span className="flex size-4 items-center justify-center [&_svg]:size-4">
              <ProviderIcon provider={provider} />
            </span>
            {SOCIAL_PROVIDER_LABELS[provider]}
          </>
        }
      >
        {connected ? (
          <>
            <StatusDot className="text-muted-foreground" tone="success">
              Connected
            </StatusDot>
            <Button
              disabled={props.disabled || props.isLast}
              loading={pending}
              size="sm"
              type="submit"
              variant="outline"
            >
              Disconnect
            </Button>
          </>
        ) : (
          <Button
            disabled={props.disabled || !available}
            loading={pending}
            size="sm"
            type="submit"
            variant="outline"
          >
            Connect
          </Button>
        )}
      </SettingsRow>
    </form>
  );
}
