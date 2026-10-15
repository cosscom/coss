import { Badge } from "@coss/ui/components/badge";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { SettingsFooter, SettingsPage, SettingsRow, SettingsSection } from "@/components/settings";
import { formatDateTime } from "@/lib/format";
import { listOwnSessions, requireSession } from "@/lib/session";
import { describeUserAgent } from "@/lib/user-agent";
import { RevokeOtherSessionsButton, RevokeSessionButton } from "../session-buttons";

export const metadata: Metadata = { title: "Sessions" };

/** Browsers where the user is signed in. */
export default async function AccountSessionsPage() {
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        description="Browsers where you're signed in. Sign out of any you don't recognize."
        title="Sessions"
      />

      <SettingsPage>
        <SettingsSection>
          {sessions.map((row) => (
            <SettingsRow
              description={
                <>
                  <span className="block">
                    <span className="font-mono text-xs">{row.ipAddress || "Unknown address"}</span>
                    {" · "}Signed in {formatDateTime(row.createdAt)}
                  </span>
                  <span className="block">Expires {formatDateTime(row.expiresAt)}</span>
                </>
              }
              key={row.id}
              label={
                <>
                  {row.device}
                  {row.current ? <Badge variant="outline">This browser</Badge> : null}
                  {row.sso ? <Badge variant="outline">SSO</Badge> : null}
                </>
              }
            >
              {row.current ? null : (
                <RevokeSessionButton disabled={impersonating} sessionId={row.id} />
              )}
            </SettingsRow>
          ))}
          {otherSessions > 0 ? (
            <SettingsFooter
              hint={`${otherSessions} other ${otherSessions === 1 ? "session" : "sessions"}`}
            >
              <RevokeOtherSessionsButton disabled={impersonating} />
            </SettingsFooter>
          ) : null}
        </SettingsSection>
      </SettingsPage>
    </div>
  );
}
