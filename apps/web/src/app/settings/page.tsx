import { Badge } from "@coss/ui/components/badge";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelBody, PanelRow } from "@/components/panel";
import { SpecItem, SpecList } from "@/components/spec-list";
import { formatDateTime } from "@/lib/format";
import { requireSession } from "@/lib/session";
import { ProfileForm, SendVerificationEmailButton } from "./profile-form";

export const metadata: Metadata = { title: "Account settings" };

/** The signed-in user's profile and email address. */
export default async function AccountProfilePage() {
  const session = await requireSession();
  const impersonating = Boolean(session.session.impersonatedBy);
  const { user } = session;

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
