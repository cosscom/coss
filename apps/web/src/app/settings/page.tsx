import { DASHBOARD_PATH } from "@coss/auth/slugs";
import { Alert, AlertDescription } from "@coss/ui/components/alert";
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
import { authHeaders, requireSession } from "@/lib/session";
import { describeUserAgent } from "@/lib/user-agent";
import { PasswordForm } from "./password-form";
import { ProfileForm, SendVerificationEmailButton } from "./profile-form";
import { RevokeOtherSessionsButton, RevokeSessionButton } from "./session-buttons";

export const metadata: Metadata = { title: "Account settings" };

/** The signed-in user's own account: profile, email verification, password and sessions. */
export default async function AccountSettingsPage() {
  const session = await requireSession();
  const impersonating = Boolean(session.session.impersonatedBy);
  const sessions = (await auth.api.listSessions({ headers: await authHeaders() }))
    // Only what the page shows: session tokens never leave the server.
    .map(({ id, userAgent, ipAddress, createdAt, expiresAt }) => ({
      id,
      device: describeUserAgent(userAgent),
      ipAddress,
      createdAt,
      expiresAt,
      current: id === session.session.id,
    }))
    .toSorted((a, b) => Number(b.current) - Number(a.current) || +b.createdAt - +a.createdAt);
  const otherSessions = sessions.filter((row) => !row.current).length;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader session={session}>
        <Button render={<Link href={DASHBOARD_PATH} />} size="sm" variant="ghost">
          Dashboard
        </Button>
      </SiteHeader>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
        <PageHeader description="Your profile, password and signed-in sessions." title="Account" />

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
              Changing it signs out every other session. Forgot it? Sign out and use “Forgot
              password”.
            </CardDescription>
          </CardHeader>
          <CardPanel>
            <PasswordForm disabled={impersonating} />
          </CardPanel>
        </Card>

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
