import { DASHBOARD_PATH } from "@coss/auth/slugs";
import { listOrganizationsRequiringSso, listOrganizationsRequiringTwoFactor } from "@coss/tenancy";
import { Alert, AlertDescription, AlertTitle } from "@coss/ui/components/alert";
import Link from "next/link";
import { AppShell } from "@/components/shell/app-shell";
import { AreaSidebar } from "@/components/shell/area-sidebar";
import { isPlatformAdmin, requireSession } from "@/lib/session";

/**
 * The signed-in user's own account: profile (`/settings`), sign-in methods (`/settings/security`)
 * and sessions (`/settings/sessions`). Organizations that require two-factor send members to the
 * security page; the requirement shows on every page of the area.
 */
export default async function AccountLayout({ children }: LayoutProps<"/settings">) {
  const session = await requireSession();
  const impersonating = Boolean(session.session.impersonatedBy);
  const [requiredBy, ssoRequiredBy] = await Promise.all([
    listOrganizationsRequiringTwoFactor({ userId: session.user.id }),
    listOrganizationsRequiringSso({ userId: session.user.id }),
  ]);
  const twoFactorMissing = requiredBy.length > 0 && !session.user.twoFactorEnabled;
  const ssoMissing = ssoRequiredBy.length > 0 && !session.session.ssoProviderId;
  const user = {
    name: session.user.name,
    email: session.user.email,
    isAdmin: isPlatformAdmin(session),
  };

  return (
    <AppShell
      banners={
        twoFactorMissing || ssoMissing || impersonating ? (
          <div className="flex flex-col gap-3">
            {twoFactorMissing ? (
              <Alert variant="warning">
                <AlertTitle>Two-factor authentication required</AlertTitle>
                <AlertDescription>
                  <span>
                    {requiredBy.map((org) => org.name).join(", ")}{" "}
                    {requiredBy.length === 1 ? "requires" : "require"} members to use an
                    authenticator app.{" "}
                    <Link className="underline underline-offset-4" href="/settings/security">
                      Set one up under Security
                    </Link>{" "}
                    to continue.
                  </span>
                </AlertDescription>
              </Alert>
            ) : null}
            {ssoMissing ? (
              <Alert variant="info">
                <AlertTitle>Single sign-on required</AlertTitle>
                <AlertDescription>
                  <span>
                    {ssoRequiredBy.map((org) => org.name).join(", ")}{" "}
                    {ssoRequiredBy.length === 1 ? "requires" : "require"} members to sign in with
                    SSO.{" "}
                    <Link className="underline underline-offset-4" href="/sso">
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
          </div>
        ) : null
      }
      command={{ isAdmin: user.isAdmin }}
      names={{ "/settings": "Account" }}
      session={session}
      sidebar={
        <AreaSidebar
          area="account"
          back={{ href: DASHBOARD_PATH, label: "Dashboard" }}
          user={user}
        />
      }
    >
      {children}
    </AppShell>
  );
}
