import { getReceivedEmail } from "@coss/email";
import { getEnvironment } from "@coss/tenancy";
import { Alert, AlertDescription } from "@coss/ui/components/alert";
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
import { ReceivedStatusBadge, SandboxBadge, VerdictBadge } from "@/components/email-badges";
import { PageHeader } from "@/components/page-header";
import { formatBytes, formatDateTime } from "@/lib/format";
import { requireOrgMember } from "@/lib/session";
import { DeleteReceivedEmailButton } from "../received-forms";

export const metadata: Metadata = { title: "Received email" };

/**
 * Prepended to the sender's HTML so the parser places it in <head>. Received HTML is written by
 * anyone on the internet: with `sandbox=""` (no scripts, forms, popups or same-origin access) it
 * may load nothing at all, not even remote images (tracking pixels would tell the sender the
 * email was opened, and from where). Only inline `data:` images and fonts render.
 * NEVER add `allow-scripts` or `allow-same-origin` to the iframe.
 */
const INBOUND_PREVIEW_HEAD =
  `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:">` +
  `<meta name="referrer" content="no-referrer">`;

function list(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "—";
}

export default async function ReceivedEmailPage({
  params,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/received/[receivedId]">) {
  const { orgSlug, projectSlug, envSlug, receivedId } = await params;
  const { organization, can } = await requireOrgMember(orgSlug);
  if (!can({ email: ["read"] })) notFound();
  const found = await getEnvironment({ organizationId: organization.id, projectSlug, envSlug });
  if (!found) notFound();
  const { project, environment } = found;
  const email = await getReceivedEmail({
    organizationId: organization.id,
    environmentId: environment.id,
    id: receivedId,
  });
  if (!email) notFound();

  const listPath = `/${organization.slug}/projects/${project.slug}/${environment.slug}/received`;
  const emailPath = `${listPath}/${email.id}`;
  const { verdicts } = email;
  const rows: [string, ReactNode][] = [
    ["ID", <code key="id">{email.id}</code>],
    [
      "Status",
      <span className="flex items-center gap-1" key="status">
        <ReceivedStatusBadge status={email.status} />
        {email.spam ? <Badge variant="warning">spam</Badge> : null}
      </span>,
    ],
    ["Mode", <SandboxBadge key="mode" sandbox={email.sandbox} />],
    ["From", email.from ?? "—"],
    ["To", list(email.to)],
    ["Cc", list(email.cc)],
    ["Reply-To", list(email.reply_to)],
    ["Envelope sender", email.mail_from || "—"],
    ["Received for", list(email.recipients)],
    ["Received", formatDateTime(email.received_at)],
    ["Date header", formatDateTime(email.sent_at)],
    ["Message-ID", email.message_id ? <code key="mid">{email.message_id}</code> : "—"],
    ["In-Reply-To", email.in_reply_to ? <code key="irt">{email.in_reply_to}</code> : "—"],
    ["Size", formatBytes(email.size)],
    [
      "Verdicts",
      <span className="flex flex-wrap gap-1" key="verdicts">
        <VerdictBadge label="spam" verdict={verdicts.spam} />
        <VerdictBadge label="virus" verdict={verdicts.virus} />
        <VerdictBadge label="SPF" verdict={verdicts.spf} />
        <VerdictBadge label="DKIM" verdict={verdicts.dkim} />
        <VerdictBadge label="DMARC" verdict={verdicts.dmarc} />
        {verdicts.dmarc_policy ? (
          <Badge variant="outline">DMARC policy: {verdicts.dmarc_policy}</Badge>
        ) : null}
      </span>,
    ],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link className="text-muted-foreground text-sm hover:text-foreground" href={listPath}>
          ← Received emails
        </Link>
        <PageHeader
          actions={
            <>
              {email.status === "received" ? (
                <Button
                  render={<a download href={`${emailPath}/raw`} />}
                  size="sm"
                  variant="outline"
                >
                  Download .eml
                </Button>
              ) : null}
              {can({ receivedEmail: ["delete"] }) ? (
                <DeleteReceivedEmailButton
                  envSlug={environment.slug}
                  orgSlug={organization.slug}
                  projectSlug={project.slug}
                  receivedEmailId={email.id}
                />
              ) : null}
            </>
          }
          title={email.subject || "(no subject)"}
        />
      </div>

      {email.status === "blocked" ? (
        <Alert variant="error">
          <AlertDescription>
            This message carried a virus, so its content was never stored or announced by webhook.
          </AlertDescription>
        </Alert>
      ) : null}
      {email.truncated ? (
        <Alert variant="info">
          <AlertDescription>
            Some of this email&apos;s headers or bodies were too long to show in full; download the
            .eml for all of it.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardPanel className="p-2">
          <Table>
            <TableBody>
              {rows.map(([label, value]) => (
                <TableRow key={label}>
                  <TableHead className="w-44 align-top">{label}</TableHead>
                  <TableCell className="whitespace-normal break-all">{value}</TableCell>
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
              Sent by an outside sender: open them only if you trust it.
            </CardDescription>
          </CardHeader>
          <CardPanel className="p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">File</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {email.attachments.map((attachment) => (
                  <TableRow key={attachment.id}>
                    <TableCell className="break-all">
                      {attachment.filename ?? "(unnamed)"}
                      {attachment.disposition === "inline" ? (
                        <span className="text-muted-foreground"> (inline)</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {attachment.content_type}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatBytes(attachment.size)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        render={<a download href={`${emailPath}/attachments/${attachment.id}`} />}
                        size="sm"
                        variant="outline"
                      >
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardPanel>
        </Card>
      ) : null}

      {email.html !== null ? (
        <Card>
          <CardHeader>
            <CardTitle>HTML</CardTitle>
            <CardDescription>Remote images and other content are not loaded.</CardDescription>
          </CardHeader>
          <CardPanel>
            <iframe
              className="h-[600px] w-full rounded-lg border bg-white"
              referrerPolicy="no-referrer"
              sandbox=""
              srcDoc={INBOUND_PREVIEW_HEAD + email.html}
              title="Received email preview"
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

      {email.headers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Headers</CardTitle>
          </CardHeader>
          <CardPanel className="max-h-[480px] overflow-auto p-2">
            <Table>
              <TableBody>
                {email.headers.map((header, index) => (
                  // Headers repeat (Received), so their position is part of the key.
                  // biome-ignore lint/suspicious/noArrayIndexKey: the list never reorders.
                  <TableRow key={`${index}-${header.name}`}>
                    <TableHead className="w-56 align-top font-mono text-xs">
                      {header.name}
                    </TableHead>
                    <TableCell className="whitespace-normal break-all font-mono text-xs">
                      {header.value}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardPanel>
        </Card>
      ) : null}
    </div>
  );
}
