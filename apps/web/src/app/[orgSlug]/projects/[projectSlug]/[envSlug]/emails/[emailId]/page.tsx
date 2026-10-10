import { type EmailEventOutput, getEmail, listEmailEvents } from "@coss/email";
import { getEnvironment } from "@coss/tenancy";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
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
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  EmailEventBadge,
  EmailStatusBadge,
  RecipientStatusBadge,
  SandboxBadge,
} from "@/components/email-badges";
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/format";
import { requireOrgMember } from "@/lib/session";

export const metadata: Metadata = { title: "Email" };

/**
 * Prepended to customer HTML so the parser places it in <head>. Together with `sandbox=""`
 * (no scripts, forms, popups or same-origin access) it blocks every network load except
 * images and fonts, and stops the dashboard URL from leaking via Referer.
 * NEVER add `allow-scripts` or `allow-same-origin` to the iframe.
 */
const PREVIEW_HEAD =
  `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; style-src 'unsafe-inline'; font-src data: https:">` +
  `<meta name="referrer" content="no-referrer">`;

function list(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "—";
}

/** One-line summary of an event's details. */
function eventDetail({ data }: EmailEventOutput): string {
  if (data.bounce) {
    const { type, sub_type, diagnostic_code } = data.bounce;
    return [`${type} / ${sub_type}`, diagnostic_code].filter(Boolean).join(": ");
  }
  if (data.complaint) return data.complaint.feedback_type ?? "complaint";
  if (data.delay) return [data.delay.type, data.delay.diagnostic_code].filter(Boolean).join(": ");
  if (data.delivery) return data.delivery.smtp_response ?? "";
  if (data.failure) return data.failure.message;
  if (data.suppression) {
    const scope = data.suppression.scope === "*" ? "all emails" : data.suppression.scope;
    return `on the suppression list (${scope}, ${data.suppression.reason})`;
  }
  return "";
}

export default async function EmailPage({
  params,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/emails/[emailId]">) {
  const { orgSlug, projectSlug, envSlug, emailId } = await params;
  const { organization, can } = await requireOrgMember(orgSlug);
  if (!can({ email: ["read"] })) notFound();
  const found = await getEnvironment({ organizationId: organization.id, projectSlug, envSlug });
  if (!found) notFound();
  const { project, environment } = found;
  const email = await getEmail({
    organizationId: organization.id,
    environmentId: environment.id,
    id: emailId,
  });
  if (!email) notFound();
  const events = await listEmailEvents({
    organizationId: organization.id,
    environmentId: environment.id,
    emailId: email.id,
  });

  const rows: [string, ReactNode][] = [
    ["ID", <code key="id">{email.id}</code>],
    ["Status", <EmailStatusBadge key="status" status={email.status} />],
    ["Mode", <SandboxBadge key="mode" sandbox={email.sandbox} />],
    ["From", email.from],
    ["To", list(email.to)],
    ["Cc", list(email.cc)],
    ["Bcc", list(email.bcc)],
    ["Reply-To", list(email.reply_to)],
    ["Created", formatDateTime(email.created_at)],
    ["Sent", formatDateTime(email.sent_at)],
    ["Category", email.category ?? "—"],
    [
      "Tags",
      email.tags.length > 0 ? email.tags.map((t) => `${t.name}=${t.value}`).join(", ") : "—",
    ],
    [
      "Headers",
      Object.keys(email.headers).length > 0
        ? Object.entries(email.headers)
            .map(([name, value]) => `${name}: ${value}`)
            .join("\n")
        : "—",
    ],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          className="text-muted-foreground text-sm hover:text-foreground"
          href={`/${organization.slug}/projects/${project.slug}/${environment.slug}`}
        >
          ← {project.name} · {environment.name}
        </Link>
        <PageHeader title={email.subject} />
      </div>

      <Card>
        <CardPanel className="p-2">
          <Table>
            <TableBody>
              {rows.map(([label, value]) => (
                <TableRow key={label}>
                  <TableHead className="w-32 align-top">{label}</TableHead>
                  <TableCell className="whitespace-pre-wrap break-all">{value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recipients</CardTitle>
          <CardDescription>Delivery status of each distinct address.</CardDescription>
        </CardHeader>
        <CardPanel className="p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last event</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {email.recipients.map((recipient) => (
                <TableRow key={recipient.address}>
                  <TableCell className="break-all">{recipient.address}</TableCell>
                  <TableCell>{recipient.type}</TableCell>
                  <TableCell>
                    <RecipientStatusBadge status={recipient.status} />
                  </TableCell>
                  <TableCell>{formatDateTime(recipient.last_event_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardPanel className="p-2">
          {events && events.events.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(event.occurred_at)}
                    </TableCell>
                    <TableCell>
                      <EmailEventBadge type={event.type} />
                    </TableCell>
                    <TableCell className="break-all">{event.recipient ?? "All"}</TableCell>
                    <TableCell className="whitespace-normal break-all text-muted-foreground">
                      {eventDetail(event)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-4 text-muted-foreground text-sm">No events yet.</p>
          )}
        </CardPanel>
      </Card>

      {email.html !== null ? (
        <Card>
          <CardHeader>
            <CardTitle>HTML</CardTitle>
          </CardHeader>
          <CardPanel>
            <iframe
              className="h-[600px] w-full rounded-lg border bg-white"
              referrerPolicy="no-referrer"
              sandbox=""
              srcDoc={PREVIEW_HEAD + email.html}
              title="Email preview"
            />
          </CardPanel>
        </Card>
      ) : null}

      {email.text !== null ? (
        <Card>
          <CardHeader>
            <CardTitle>Text</CardTitle>
          </CardHeader>
          <CardPanel>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border bg-muted px-3 py-2 text-sm">
              {email.text}
            </pre>
          </CardPanel>
        </Card>
      ) : null}
    </div>
  );
}
