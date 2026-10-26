import { Alert, AlertDescription } from "@coss/ui/components/alert";
import { Badge } from "@coss/ui/components/badge";
import type { Metadata } from "next";
import Link from "next/link";
import { CopyValue } from "@/components/copy-value";
import { PageHeader } from "@/components/page-header";
import { SettingsPage, SettingsRow, SettingsSection } from "@/components/settings";
import { UserAvatar } from "@/components/user-avatar";
import { accountDeletionPlan, blockerMessage } from "@/lib/account-deletion";
import { avatarSource, avatarUrl } from "@/lib/avatars";
import { formatDateTime } from "@/lib/format";
import { requireSession } from "@/lib/session";
import { DeleteAccountButton } from "./delete-account-button";
import { ProfileForm, SendVerificationEmailButton } from "./profile-form";
import { ThemePicker } from "./theme-picker";

export const metadata: Metadata = { title: "Account settings" };

const PICTURE_SOURCES = {
  google: "From your Google account.",
  github: "From your GitHub account.",
  gravatar: "From Gravatar, for your email address.",
} as const;

/** The signed-in user's profile, email address and appearance. */
export default async function AccountProfilePage() {
  const session = await requireSession();
  const impersonating = Boolean(session.session.impersonatedBy);
  const { user } = session;
  const source = avatarSource(user);
  const deletion = await accountDeletionPlan(user.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader description="Your profile and the address you sign in with." title="Profile" />

      <SettingsPage>
        <SettingsSection>
          <SettingsRow
            description={
              <>
                {source
                  ? PICTURE_SOURCES[source]
                  : "Verify your email address to use its Gravatar, or connect Google or GitHub."}
                {source === "gravatar" ? (
                  <>
                    {" "}
                    No picture?{" "}
                    <a
                      className="text-foreground underline underline-offset-4"
                      href="https://gravatar.com"
                      rel="noreferrer"
                      target="_blank"
                    >
                      Set one on Gravatar
                    </a>{" "}
                    or connect Google or GitHub under{" "}
                    <Link
                      className="text-foreground underline underline-offset-4"
                      href="/settings/security"
                    >
                      Security
                    </Link>
                    .
                  </>
                ) : null}
              </>
            }
            label="Picture"
          >
            <UserAvatar
              className="size-12 border"
              user={{ name: user.name, email: user.email, image: avatarUrl(user) }}
            />
          </SettingsRow>
          <SettingsRow
            description={
              user.emailVerified
                ? "You sign in with this address."
                : "Verify it to accept invitations and create live API keys."
            }
            label={
              <>
                Email
                {user.emailVerified ? (
                  <Badge variant="success">Verified</Badge>
                ) : (
                  <Badge variant="warning">Unverified</Badge>
                )}
              </>
            }
          >
            <span className="min-w-0 font-mono text-[0.8125rem] [overflow-wrap:anywhere]">
              {user.email}
            </span>
            {user.emailVerified ? null : <SendVerificationEmailButton disabled={impersonating} />}
          </SettingsRow>
          <ProfileForm disabled={impersonating} name={user.name} />
        </SettingsSection>

        <SettingsSection title="Appearance">
          <SettingsRow description="Applies to the dashboard in this browser." label="Theme">
            <ThemePicker />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Account">
          <SettingsRow description="Include it when you contact support." label="User ID">
            <CopyValue value={user.id} />
          </SettingsRow>
          <SettingsRow label="Created">
            <span className="font-mono text-[0.8125rem] text-muted-foreground">
              {formatDateTime(user.createdAt)}
            </span>
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Danger zone" tone="danger">
          <SettingsRow
            description="Deletes your profile and sign-in methods, signs you out everywhere and removes you from your organizations. Organizations you're the only member of are deleted too."
            label="Delete account"
          >
            <DeleteAccountButton
              deleteOrganizations={deletion.deleteOrganizations}
              disabled={impersonating || deletion.blockers.length > 0}
              email={user.email}
              leaveOrganizations={deletion.leaveOrganizations}
            />
          </SettingsRow>
          {deletion.blockers.length > 0 ? (
            <div className="border-t px-5 py-4">
              <Alert variant="warning">
                <AlertDescription>
                  {deletion.blockers.map((blocker) => (
                    <p
                      key={
                        blocker.kind + ("organization" in blocker ? blocker.organization.id : "")
                      }
                    >
                      {blockerMessage(blocker)}
                    </p>
                  ))}
                </AlertDescription>
              </Alert>
            </div>
          ) : null}
        </SettingsSection>
      </SettingsPage>
    </div>
  );
}
