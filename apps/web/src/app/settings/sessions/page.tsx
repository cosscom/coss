import { Badge } from "@coss/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { auth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { authHeaders, requireSession } from "@/lib/session";
import { describeUserAgent } from "@/lib/user-agent";
import { RevokeOtherSessionsButton, RevokeSessionButton } from "../session-buttons";

export const metadata: Metadata = { title: "Sessions" };

/** Browsers where the user is signed in. */
export default async function AccountSessionsPage() {
  const session = await requireSession();
  const impersonating = Boolean(session.session.impersonatedBy);
  const sessions = (await auth.api.listSessions({ headers: await authHeaders() }))
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
        actions={otherSessions > 0 ? <RevokeOtherSessionsButton disabled={impersonating} /> : null}
        description="Browsers where you're signed in. Sign out of any you don't recognize."
        title="Sessions"
      />

      <Panel>
        <Table variant="card">
          <TableHeader>
            <TableRow>
              <TableHead>Device</TableHead>
              <TableHead>IP address</TableHead>
              <TableHead>Signed in</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    {row.device}
                    {row.current ? <Badge variant="outline">This browser</Badge> : null}
                    {row.sso ? <Badge variant="outline">SSO</Badge> : null}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-muted-foreground text-xs">
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
      </Panel>
    </div>
  );
}
