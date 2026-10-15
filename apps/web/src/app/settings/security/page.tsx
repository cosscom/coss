import { getAuthenticatorName } from "@better-auth/passkey";
import { isSocialProvider, SOCIAL_PROVIDERS } from "@coss/auth/constants";
import { listOrganizationsRequiringTwoFactor } from "@coss/tenancy";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { SettingsPage, SettingsSection } from "@/components/settings";
import { auth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { authHeaders, requireSession } from "@/lib/session";
import { enabledSocialProviders } from "@/lib/social";
import { socialErrorMessage } from "@/lib/social-errors";
import { type ConnectedAccountRow, ConnectedAccountsCard } from "../connected-accounts-card";
import { type PasskeyRow, PasskeysCard } from "../passkeys-card";
import { PasswordForm, SetPasswordForm } from "../password-form";
import { TwoFactorCard } from "../two-factor-card";

export const metadata: Metadata = { title: "Security" };

/**
 * How the user signs in: password, connected Google and GitHub accounts, authenticator app and
 * passkeys. Organizations that require two-factor send members without it here. Connecting an
 * account comes back here (`?error=` on failure).
 */
export default async function AccountSecurityPage({
  searchParams,
}: PageProps<"/settings/security">) {
  const { error } = await searchParams;
  const session = await requireSession();
  const impersonating = Boolean(session.session.impersonatedBy);
  const [requiredBy, passkeys, accounts] = await Promise.all([
    listOrganizationsRequiringTwoFactor({ userId: session.user.id }),
    auth.api.listPasskeys({ headers: await authHeaders() }),
    auth.api.listUserAccounts({ headers: await authHeaders() }),
  ]);
  const hasPassword = accounts.some((account) => account.providerId === "credential");
  const connected = new Set(accounts.map((account) => account.providerId).filter(isSocialProvider));
  const available = enabledSocialProviders();
  const connectedAccounts: ConnectedAccountRow[] = SOCIAL_PROVIDERS.filter(
    (provider) => available.includes(provider) || connected.has(provider),
  ).map((provider) => ({
    provider,
    connected: connected.has(provider),
    available: available.includes(provider),
  }));
  // Better Auth won't unlink an account's only one (passkeys aside).
  const [onlyAccount] = accounts.length === 1 ? accounts : [];
  const lastSignInMethod =
    onlyAccount && isSocialProvider(onlyAccount.providerId) ? onlyAccount.providerId : null;
  // Mirrors the Better Auth hook in @coss/auth/options, which enforces it.
  const factorRestriction = impersonating
    ? "Two-factor settings and passkeys can't be changed while impersonating a user."
    : null;
  const passkeyRows: PasskeyRow[] = passkeys
    .toSorted((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((passkey) => ({
      id: passkey.id,
      name: passkey.name || getAuthenticatorName(passkey.aaguid) || "Passkey",
      synced: passkey.backedUp,
      createdAt: formatDateTime(passkey.createdAt),
    }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        description="How you sign in: your password, connected accounts, authenticator app and passkeys."
        title="Security"
      />

      <SettingsPage>
        <SettingsSection
          description={
            hasPassword
              ? "Forgot it? Sign out and use “Forgot password”."
              : "You sign in with a connected account. Set a password to also sign in with your email address."
          }
          title="Password"
        >
          {hasPassword ? (
            <PasswordForm disabled={impersonating} />
          ) : (
            <SetPasswordForm disabled={impersonating} />
          )}
        </SettingsSection>

        {connectedAccounts.length > 0 ? (
          <ConnectedAccountsCard
            disabled={impersonating}
            error={socialErrorMessage(typeof error === "string" ? error : null)}
            lastSignInMethod={lastSignInMethod}
            rows={connectedAccounts}
          />
        ) : null}

        <TwoFactorCard
          enabled={Boolean(session.user.twoFactorEnabled)}
          needsPassword={!hasPassword}
          requiredBy={requiredBy.map((org) => org.name)}
          restriction={factorRestriction}
        />

        <PasskeysCard passkeys={passkeyRows} restriction={factorRestriction} />
      </SettingsPage>
    </div>
  );
}
