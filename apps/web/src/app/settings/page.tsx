import { Badge } from "@coss/ui/components/badge";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelBody, PanelRow } from "@/components/panel";
import { SpecItem, SpecList } from "@/components/spec-list";
import { UserAvatar } from "@/components/user-avatar";
import { avatarSource, avatarUrl } from "@/lib/avatars";
import { formatDateTime } from "@/lib/format";
import { requireSession } from "@/lib/session";
import { ProfileForm, SendVerificationEmailButton } from "./profile-form";

export const metadata: Metadata = { title: "Account settings" };

const PICTURE_SOURCES = {
  google: "From your Google account.",
  github: "From your GitHub account.",
  gravatar: "From Gravatar, for your email address.",
} as const;

/** The signed-in user's profile and email address. */
export default async function AccountProfilePage() {
  const session = await requireSession();
  const impersonating = Boolean(session.session.impersonatedBy);
  const { user } = session;
  const source = avatarSource(user);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader description="Your profile and the address you sign in with." title="Profile" />

      <Panel>
        <PanelBody flush>
          <PanelRow description="Shown to the other members of your organizations." label="Name">
            <div className="w-full max-w-md">
              <ProfileForm disabled={impersonating} name={user.name} />
            </div>
          </PanelRow>
          <PanelRow
            description={
              source
                ? PICTURE_SOURCES[source]
                : "Verify your email address to use its Gravatar, or connect Google or GitHub."
            }
            label="Picture"
          >
            <UserAvatar
              className="size-12 border"
              user={{ name: user.name, email: user.email, image: avatarUrl(user) }}
            />
            {source === "gravatar" ? (
              <p className="text-muted-foreground text-sm">
                No picture?{" "}
                <a
                  className="underline underline-offset-4"
                  href="https://gravatar.com"
                  rel="noreferrer"
                  target="_blank"
                >
                  Set one on Gravatar
                </a>{" "}
                or connect Google or GitHub under{" "}
                <Link className="underline underline-offset-4" href="/settings/security">
                  Security
                </Link>
                .
              </p>
            ) : null}
          </PanelRow>
          <PanelRow
            description={
              user.emailVerified
                ? "You sign in with this address."
                : "Verify it to accept invitations and create live API keys."
            }
            label={
              <span className="flex items-center gap-2">
                Email
                {user.emailVerified ? (
                  <Badge variant="success">Verified</Badge>
                ) : (
                  <Badge variant="warning">Unverified</Badge>
                )}
              </span>
            }
          >
            <span className="font-mono text-sm">{user.email}</span>
            {user.emailVerified ? null : <SendVerificationEmailButton disabled={impersonating} />}
          </PanelRow>
        </PanelBody>
      </Panel>

      <Panel title="Account">
        <PanelBody flush>
          <SpecList>
            <SpecItem label="User ID" mono>
              {user.id}
            </SpecItem>
            <SpecItem label="Created" mono>
              {formatDateTime(user.createdAt)}
            </SpecItem>
          </SpecList>
        </PanelBody>
      </Panel>
    </div>
  );
}
