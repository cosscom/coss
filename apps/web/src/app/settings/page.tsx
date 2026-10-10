import { getAuthenticatorName } from "@better-auth/passkey";
import { listOrganizationsRequiringTwoFactor } from "@coss/tenancy";
import { Alert, AlertDescription, AlertTitle } from "@coss/ui/components/alert";
import { Button } from "@coss/ui/components/button";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SignOutButton } from "@/components/sign-out-button";
import { auth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { requireSession } from "@/lib/session";
import { type PasskeyRow, PasskeysCard } from "./passkeys-card";
import { TwoFactorCard } from "./two-factor-card";

export const metadata: Metadata = { title: "Account security" };

/**
 * Account security: authenticator app (TOTP) and passkeys. Organizations that require two-factor
 * authentication redirect members without it here (`requireOrgMember`).
 */
export default async function SettingsPage() {
  const session = await requireSession();
  const [requiredBy, passkeys] = await Promise.all([
    listOrganizationsRequiringTwoFactor({ userId: session.user.id }),
    auth.api.listPasskeys({ headers: await headers() }),
  ]);
  const twoFactorEnabled = Boolean(session.user.twoFactorEnabled);
  // Mirrors the Better Auth hook in @coss/auth/options, which enforces it.
  const restriction = session.session.impersonatedBy
    ? "Two-factor settings and passkeys can't be changed while impersonating a user."
    : null;
  const rows: PasskeyRow[] = passkeys
    .toSorted((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((passkey) => ({
      id: passkey.id,
      name: passkey.name || getAuthenticatorName(passkey.aaguid) || "Passkey",
      synced: passkey.backedUp,
      createdAt: formatDateTime(passkey.createdAt),
    }));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-3">
          <Link className="font-semibold" href="/">
            COSS
          </Link>
          <Button render={<Link href="/" />} size="sm" variant="ghost">
            Dashboard
          </Button>
          <div className="ms-auto flex items-center gap-2">
            <span className="text-muted-foreground text-sm">{session.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
        <PageHeader description="How you sign in to COSS." title="Account security" />
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
        <TwoFactorCard
          enabled={twoFactorEnabled}
          requiredBy={requiredBy.map((org) => org.name)}
          restriction={restriction}
        />
        <PasskeysCard passkeys={rows} restriction={restriction} />
      </main>
    </div>
  );
}
