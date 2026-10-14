"use client";

import { SOCIAL_PROVIDER_LABELS, type SocialProvider } from "@coss/auth/constants";
import { Button } from "@coss/ui/components/button";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

/**
 * "Continue with Google / GitHub". Better Auth sends the browser to the provider, then back to
 * `next` (new accounts too: the dashboard sends them on to onboarding), or to `errorPath` with
 * `?error=` (`socialErrorMessage`). Two-factor users land on the sign-in page's code step.
 */
export function SocialSignInButtons(props: {
  providers: readonly SocialProvider[];
  next: string;
  /** The page to come back to on failure, with its own query (`/sign-in?next=…`). */
  errorPath: string;
  disabled?: boolean;
  onStart?: () => void;
  onError: (message: string | null) => void;
}) {
  const [pending, setPending] = useState<SocialProvider | null>(null);

  async function start(provider: SocialProvider) {
    setPending(provider);
    props.onStart?.();
    props.onError(null);
    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: props.next,
      errorCallbackURL: props.errorPath,
    });
    // On success the browser is already on its way to the provider.
    if (error) {
      props.onError(
        authErrorMessage(error, `Could not sign in with ${SOCIAL_PROVIDER_LABELS[provider]}.`),
      );
      setPending(null);
    }
  }

  return props.providers.map((provider) => (
    <Button
      disabled={props.disabled || pending !== null}
      key={provider}
      loading={pending === provider}
      onClick={() => start(provider)}
      variant="outline"
    >
      <ProviderIcon provider={provider} />
      Continue with {SOCIAL_PROVIDER_LABELS[provider]}
    </Button>
  ));
}

export function ProviderIcon({ provider }: { provider: SocialProvider }) {
  return provider === "google" ? (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.6 10.6 0 0 0 12 1 11 11 0 0 0 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
        fill="#EA4335"
      />
    </svg>
  ) : (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
