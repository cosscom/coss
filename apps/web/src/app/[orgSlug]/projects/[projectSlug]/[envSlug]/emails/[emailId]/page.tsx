import { orgRoleCan } from "@coss/auth/permissions";
import { getEmail } from "@coss/email";
import { getEnvironment } from "@coss/tenancy";
import { Card, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@coss/ui/components/table";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { EmailStatusBadge, SandboxBadge } from "@/components/email-badges";
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

export default async function EmailPage({
  params,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/emails/[emailId]">) {
  const { orgSlug, projectSlug, envSlug, emailId } = await params;
  const { organization, member } = await requireOrgMember(orgSlug);
  if (!orgRoleCan(member.role, { email: ["read"] })) notFound();
  const found = await getEnvironment({ organizationId: organization.id, projectSlug, envSlug });
  if (!found) notFound();
  const { project, environment } = found;
  const email = await getEmail({
    organizationId: organization.id,
    environmentId: environment.id,
    id: emailId,
  });
  if (!email) notFound();

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
