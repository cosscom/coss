import { getAuthenticatorName } from "@better-auth/passkey";
import { listOrganizationsRequiringTwoFactor } from "@coss/tenancy";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelBody } from "@/components/panel";
import { auth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { authHeaders, requireSession } from "@/lib/session";
import { type PasskeyRow, PasskeysCard } from "../passkeys-card";
import { PasswordForm } from "../password-form";
import { TwoFactorCard } from "../two-factor-card";

export const metadata: Metadata = { title: "Security" };

/**
 * How the user signs in: password, authenticator app and passkeys. Organizations that require
 * two-factor send members without it here.
 */
export default async function AccountSecurityPage() {
  const session = await requireSession();
  const impersonating = Boolean(session.session.impersonatedBy);
  const [requiredBy, passkeys] = await Promise.all([
    listOrganizationsRequiringTwoFactor({ userId: session.user.id }),
    auth.api.listPasskeys({ headers: await authHeaders() }),
  ]);
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
      <PageHeader description="Your password, authenticator app and passkeys." title="Security" />

      <Panel
        description="Changing it signs out every other session. Forgot it? Sign out and use “Forgot password”."
        title="Password"
      >
        <PanelBody>
          <PasswordForm disabled={impersonating} />
        </PanelBody>
      </Panel>

      <TwoFactorCard
        enabled={Boolean(session.user.twoFactorEnabled)}
        requiredBy={requiredBy.map((org) => org.name)}
        restriction={factorRestriction}
      />

      <PasskeysCard passkeys={passkeyRows} restriction={factorRestriction} />
    </div>
  );
}
