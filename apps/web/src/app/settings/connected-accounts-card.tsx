"use client";

import { SOCIAL_PROVIDER_LABELS, type SocialProvider } from "@coss/auth/constants";
import { Alert, AlertDescription } from "@coss/ui/components/alert";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { FormError } from "@/components/form-error";
import { Panel, PanelBody } from "@/components/panel";
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

/** Google and GitHub accounts that sign in to this COSS account. */
export function ConnectedAccountsCard(props: {
  rows: ConnectedAccountRow[];
  /** The only way to sign in left (no password, one provider): Better Auth keeps it. */
  lastSignInMethod: SocialProvider | null;
  /** A failed connection, from `?error=` (`socialErrorMessage`). */
  error: string | null;
  disabled: boolean;
}) {
  return (
    <Panel
      description="Sign in with these accounts too. Connecting one asks you to sign in to it; its email address may differ from yours."
      title="Connected accounts"
    >
      <PanelBody flush>
        {props.error ? (
          <div className="border-b p-4">
            <Alert variant="error">
              <AlertDescription>{props.error}</AlertDescription>
            </Alert>
          </div>
        ) : null}
        {props.rows.map((row) => (
          <ConnectedAccount
            disabled={props.disabled}
            isLast={props.lastSignInMethod === row.provider}
            key={row.provider}
            row={row}
          />
        ))}
      </PanelBody>
    </Panel>
  );
}

function ConnectedAccount(props: { row: ConnectedAccountRow; isLast: boolean; disabled: boolean }) {
  const { provider, connected, available } = props.row;
  // Connecting leaves for the provider's sign-in page, so only disconnecting is confirmed here.
  const [state, formAction, pending] = useActionToast(
    connected ? disconnectSocialAccountAction : connectSocialAccountAction,
    { success: connected ? `${SOCIAL_PROVIDER_LABELS[provider]} disconnected` : undefined },
  );
  return (
    <form action={formAction} className="flex flex-col gap-2 border-t px-5 py-3.5 first:border-t-0">
      <input name="provider" type="hidden" value={provider} />
      <div className="flex items-center gap-3">
        <span className="flex size-5 items-center justify-center [&_svg]:size-5">
          <ProviderIcon provider={provider} />
        </span>
        <span className="font-medium text-sm">{SOCIAL_PROVIDER_LABELS[provider]}</span>
        {connected ? (
          <Badge variant="outline">
            <StatusDot tone="success">Connected</StatusDot>
          </Badge>
        ) : null}
        <div className="ms-auto">
          {connected ? (
            <Button
              disabled={props.disabled || props.isLast}
              loading={pending}
              size="sm"
              title={
                props.isLast ? "Set a password first: it's your only way to sign in." : undefined
              }
              type="submit"
              variant="outline"
            >
              Disconnect
            </Button>
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
        </div>
      </div>
      <FormError message={state?.ok ? null : state?.error} />
    </form>
  );
}
