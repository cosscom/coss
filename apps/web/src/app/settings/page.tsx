import { getAuthenticatorName } from "@better-auth/passkey";
import { isSocialProvider, SOCIAL_PROVIDERS } from "@coss/auth/constants";
import { DASHBOARD_PATH } from "@coss/auth/slugs";
import { listOrganizationsRequiringSso, listOrganizationsRequiringTwoFactor } from "@coss/tenancy";
import { Alert, AlertDescription, AlertTitle } from "@coss/ui/components/alert";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@coss/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SiteHeader } from "@/components/site-header";
import { auth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { authHeaders, listOwnSessions, requireSession } from "@/lib/session";
import { enabledSocialProviders } from "@/lib/social";
import { socialErrorMessage } from "@/lib/social-errors";
import { describeUserAgent } from "@/lib/user-agent";
import { type ConnectedAccountRow, ConnectedAccountsCard } from "./connected-accounts-card";
import { type PasskeyRow, PasskeysCard } from "./passkeys-card";
import { PasswordForm, SetPasswordForm } from "./password-form";
import { ProfileForm, SendVerificationEmailButton } from "./profile-form";
import { RevokeOtherSessionsButton, RevokeSessionButton } from "./session-buttons";
import { TwoFactorCard } from "./two-factor-card";

export const metadata: Metadata = { title: "Account settings" };

/**
 * The signed-in user's own account: profile, email verification, password, connected Google and
 * GitHub accounts, two-factor, passkeys and sessions. Organizations that require two-factor send
 * members without it here. Connecting an account comes back here (`?error=` on failure).
 */
export default async function AccountSettingsPage({ searchParams }: PageProps<"/settings">) {
  const { error } = await searchParams;
  const session = await requireSession();
  const impersonating = Boolean(session.session.impersonatedBy);
  const sessions = (await listOwnSessions(session.user.id))
    // Only what the page shows: session tokens never leave the server.
    .map(({ id, userAgent, ipAddress, createdAt, expiresAt, ssoProviderId }) => ({
      id,
      sso: Boolean(ssoProviderId),
      device: describeUserAgent(userAgent),
      ipAddress,
      createdAt,
      expiresAt,
      current: id === session.session.id,
    }))
    .toSorted((a, b) => Number(b.current) - Number(a.current) || +b.createdAt - +a.createdAt);
  const otherSessions = sessions.filter((row) => !row.current).length;
  const [requiredBy, ssoRequiredBy, passkeys, accounts] = await Promise.all([
    listOrganizationsRequiringTwoFactor({ userId: session.user.id }),
    listOrganizationsRequiringSso({ userId: session.user.id }),
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
  const twoFactorEnabled = Boolean(session.user.twoFactorEnabled);
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
    <div className="flex min-h-dvh flex-col">
      <SiteHeader session={session}>
        <Button render={<Link href={DASHBOARD_PATH} />} size="sm" variant="ghost">
          Dashboard
        </Button>
      </SiteHeader>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
        <PageHeader
          description="Your profile, sign-in methods and signed-in sessions."
          title="Account"
        />

        {requiredBy.length > 0 && !twoFactorEnabled ? (
          <Alert variant="warning">
            <AlertTitle>Two-factor authentication required</AlertTitle>
            <AlertDescription>
              {requiredBy.map((org) => org.name).join(", ")}{" "}
              {requiredBy.length === 1 ? "requires" : "require"} members to use an authenticator
              app. Set one up below to continue.
            </AlertDescription>
          </Alert>
        ) : null}

        {ssoRequiredBy.length > 0 && !session.session.ssoProviderId ? (
          <Alert variant="info">
            <AlertTitle>Single sign-on required</AlertTitle>
            <AlertDescription>
              <span>
                {ssoRequiredBy.map((org) => org.name).join(", ")}{" "}
                {ssoRequiredBy.length === 1 ? "requires" : "require"} members to sign in with SSO.{" "}
                <Link className="underline" href="/sso">
                  Sign in with SSO
                </Link>
              </span>
            </AlertDescription>
          </Alert>
        ) : null}

        {impersonating ? (
          <Alert variant="warning">
            <AlertDescription>
              You are impersonating this user. Account settings are read-only.
            </AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Shown to the other members of your organizations.</CardDescription>
          </CardHeader>
          <CardPanel>
            <ProfileForm disabled={impersonating} name={session.user.name} />
          </CardPanel>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Email
              {session.user.emailVerified ? (
                <Badge variant="success">Verified</Badge>
              ) : (
                <Badge variant="warning">Unverified</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {session.user.emailVerified
                ? `You sign in with ${session.user.email}.`
                : `You sign in with ${session.user.email}. Verify it to accept invitations and create live API keys.`}
            </CardDescription>
          </CardHeader>
          {session.user.emailVerified ? null : (
            <CardPanel>
              <SendVerificationEmailButton disabled={impersonating} />
            </CardPanel>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              {hasPassword
                ? "Changing it signs out every other session. Forgot it? Sign out and use “Forgot password”."
                : "You sign in with a connected account. Set a password to also sign in with your email address."}
            </CardDescription>
          </CardHeader>
          <CardPanel>
            {hasPassword ? (
              <PasswordForm disabled={impersonating} />
            ) : (
              <SetPasswordForm disabled={impersonating} />
            )}
          </CardPanel>
        </Card>

        {connectedAccounts.length > 0 ? (
          <ConnectedAccountsCard
            disabled={impersonating}
            error={socialErrorMessage(typeof error === "string" ? error : null)}
            lastSignInMethod={lastSignInMethod}
            rows={connectedAccounts}
          />
        ) : null}

        <TwoFactorCard
          enabled={twoFactorEnabled}
          needsPassword={!hasPassword}
          requiredBy={requiredBy.map((org) => org.name)}
          restriction={factorRestriction}
        />

        <PasskeysCard passkeys={passkeyRows} restriction={factorRestriction} />

        <Card>
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
            <CardDescription>Browsers where you're signed in.</CardDescription>
            {otherSessions > 0 ? (
              <CardAction>
                <RevokeOtherSessionsButton disabled={impersonating} />
              </CardAction>
            ) : null}
          </CardHeader>
          <CardPanel className="p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>IP address</TableHead>
                  <TableHead>Signed in</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.device}
                      {row.current ? (
                        <Badge className="ms-2" variant="outline">
                          This browser
                        </Badge>
                      ) : null}
                      {row.sso ? (
                        <Badge className="ms-2" variant="outline">
                          SSO
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {row.ipAddress || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(row.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(row.expiresAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.current ? null : (
                        <RevokeSessionButton disabled={impersonating} sessionId={row.id} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardPanel>
        </Card>
      </main>
    </div>
  );
}
