import type { AdminAuditEvent } from "@coss/tenancy/admin";
import { Badge } from "@coss/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";

const ACTION_LABELS: Record<string, { label: string; variant: "error" | "success" | "info" }> = {
  "user.ban": { label: "Banned user", variant: "error" },
  "user.unban": { label: "Unbanned user", variant: "success" },
  "user.set_role": { label: "Changed platform role", variant: "info" },
  "user.impersonate": { label: "Impersonated user", variant: "info" },
  "user.revoke_session": { label: "Revoked a session", variant: "info" },
  "user.revoke_sessions": { label: "Revoked all sessions", variant: "info" },
  "user.reset_two_factor": { label: "Reset two-factor", variant: "error" },
  "organization.suspend": { label: "Suspended organization", variant: "error" },
  "organization.unsuspend": { label: "Lifted suspension", variant: "success" },
  "api_key.revoke": { label: "Revoked API key", variant: "error" },
};

function targetHref(event: AdminAuditEvent): string | null {
  if (event.targetType === "user") return `/admin/users/${event.targetId}`;
  if (event.targetType === "organization") return `/admin/organizations/${event.targetId}`;
  if (event.organizationId) return `/admin/organizations/${event.organizationId}`;
  return null;
}

/** The most useful metadata for a row, as short text. */
function describe(event: AdminAuditEvent): string {
  const meta = event.metadata;
  const parts: string[] = [];
  if (typeof meta.email === "string") parts.push(meta.email);
  if (typeof meta.slug === "string") parts.push(meta.slug);
  if (typeof meta.role === "string") parts.push(`role → ${meta.role}`);
  if (typeof meta.duration === "string") parts.push(meta.duration);
  if (typeof meta.name === "string") parts.push(`“${meta.name}”`);
  if (typeof meta.start === "string") parts.push(`${meta.start}…`);
  return parts.join(" · ") || event.targetId;
}

export function AuditLogTable({ events }: { events: AdminAuditEvent[] }) {
  if (events.length === 0) {
    return <p className="p-4 text-muted-foreground text-sm">No admin actions recorded yet.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Admin</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Target</TableHead>
          <TableHead>Reason</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => {
          const action = ACTION_LABELS[event.action];
          const href = targetHref(event);
          return (
            <TableRow key={event.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDateTime(event.createdAt)}
              </TableCell>
              <TableCell>
                {event.actorUserId ? (
                  <Link className="hover:underline" href={`/admin/users/${event.actorUserId}`}>
                    {event.actorEmail}
                  </Link>
                ) : (
                  event.actorEmail
                )}
              </TableCell>
              <TableCell>
                <Badge variant={action?.variant ?? "outline"}>
                  {action?.label ?? event.action}
                </Badge>
              </TableCell>
              <TableCell className="max-w-64 truncate">
                {href ? (
                  <Link className="hover:underline" href={href}>
                    {describe(event)}
                  </Link>
                ) : (
                  describe(event)
                )}
              </TableCell>
              <TableCell className="max-w-80 whitespace-normal text-muted-foreground">
                {event.reason ?? "—"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
