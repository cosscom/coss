import { type EmailEventOutput, getEmail, listEmailEvents, listEmailLinks } from "@coss/email";
import { getEnvironment } from "@coss/tenancy";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
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
  TrackingBadge,
} from "@/components/email-badges";
import { PageHeader } from "@/components/page-header";
import { formatBytes, formatDateTime } from "@/lib/format";
import { requireOrgMember } from "@/lib/session";
import { CancelEmailButton } from "./cancel-email-button";
import { RescheduleEmailDialog } from "./reschedule-email-dialog";

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
  if (data.click) return [data.click.url, data.click.user_agent].filter(Boolean).join(" · ");
  if (data.open) return data.open.user_agent ?? "";
  if (data.reschedule) {
    const { previous_scheduled_at, scheduled_at } = data.reschedule;
    return `${formatDateTime(previous_scheduled_at)} → ${formatDateTime(scheduled_at)}`;
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
  // One round trip: the events and links lookups check the email themselves (null when absent).
  const scope = { organizationId: organization.id, environmentId: environment.id };
  const [email, events, trackedLinks] = await Promise.all([
    getEmail({ ...scope, id: emailId }),
    listEmailEvents({ ...scope, emailId }),
    listEmailLinks({ ...scope, emailId }),
  ]);
  if (!email) notFound();
  const links = email.tracking.clicks ? trackedLinks : null;
  const { tracking } = email;

  const rows: [string, ReactNode][] = [
    ["ID", <code key="id">{email.id}</code>],
    ["Status", <EmailStatusBadge key="status" status={email.status} />],
    ["Mode", <SandboxBadge key="mode" sandbox={email.sandbox} />],
    ...(email.batch_id
      ? ([["Batch", <code key="batch">{email.batch_id}</code>]] as [string, ReactNode][])
      : []),
    ["From", email.from],
    ["To", list(email.to)],
    ["Cc", list(email.cc)],
    ["Bcc", list(email.bcc)],
    ["Reply-To", list(email.reply_to)],
    ["Created", formatDateTime(email.created_at)],
    ...(email.scheduled_at
      ? ([["Scheduled for", formatDateTime(email.scheduled_at)]] as [string, ReactNode][])
      : []),
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
        <PageHeader
          actions={
            <>
              {can({ log: ["read"] }) ? (
                <Button
                  render={
                    <Link
                      href={`/${organization.slug}/projects/${project.slug}/${environment.slug}/logs?${new URLSearchParams({ q: `resource:${email.id}`, range: "30d" })}`}
                    />
                  }
                  size="sm"
                  variant="outline"
                >
                  View logs
                </Button>
              ) : null}
              {email.status === "scheduled" && can({ email: ["send"] }) ? (
                <div className="flex gap-2">
                  {email.scheduled_at ? (
                    <RescheduleEmailDialog
                      emailId={email.id}
                      envSlug={environment.slug}
                      orgSlug={organization.slug}
                      projectSlug={project.slug}
                      scheduledAt={email.scheduled_at}
                    />
                  ) : null}
                  <CancelEmailButton
                    emailId={email.id}
                    envSlug={environment.slug}
                    orgSlug={organization.slug}
                    projectSlug={project.slug}
                  />
                </div>
              ) : null}
            </>
          }
          title={email.subject}
        />
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

      {email.attachments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Attachments</CardTitle>
            <CardDescription>
              Only metadata is kept: COSS discards the content once the email is sent.
            </CardDescription>
          </CardHeader>
          <CardPanel className="p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {email.attachments.map((attachment) => (
                  <TableRow key={attachment.id}>
                    <TableCell className="break-all">
                      <span className="flex flex-wrap items-center gap-2">
                        {attachment.filename}
                        {attachment.content_id !== null ? (
                          <Badge variant="outline">inline · cid:{attachment.content_id}</Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="break-all">{attachment.content_type}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatBytes(attachment.size)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardPanel>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Engagement</CardTitle>
          <CardDescription>
            Opens and clicks, if tracking was on when the email was sent. Opens can be inflated by
            mail clients that preload images, clicks by link scanners.
          </CardDescription>
        </CardHeader>
        <CardPanel className="p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead>Tracking</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>First</TableHead>
                <TableHead>Last</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableHead>Opens</TableHead>
                <TableCell>
                  <TrackingBadge on={tracking.opens} />
                </TableCell>
                <TableCell>{tracking.opens ? tracking.open_count : "—"}</TableCell>
                <TableCell>{formatDateTime(tracking.first_opened_at)}</TableCell>
                <TableCell>{formatDateTime(tracking.last_opened_at)}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Clicks</TableHead>
                <TableCell>
                  <TrackingBadge on={tracking.clicks} />
                </TableCell>
                <TableCell>{tracking.clicks ? tracking.click_count : "—"}</TableCell>
                <TableCell>{formatDateTime(tracking.first_clicked_at)}</TableCell>
                <TableCell>{formatDateTime(tracking.last_clicked_at)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {links && links.links.length > 0 ? (
            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Link</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Last click</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.links.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell className="max-w-120 whitespace-normal break-all">
                      {link.url}
                    </TableCell>
                    <TableCell>{link.click_count}</TableCell>
                    <TableCell>{formatDateTime(link.last_clicked_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
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
