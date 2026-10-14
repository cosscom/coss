import {
  inboundAddressFor,
  inboundDropCount,
  ListReceivedEmailsQuery,
  listEnvironmentReceivingDomains,
  listReceivedEmails,
} from "@coss/email";
import { formatRetentionDays, RETENTION_DAYS } from "@coss/retention";
import { getEnvironment } from "@coss/tenancy";
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
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { ReceivedStatusBadge } from "@/components/email-badges";
import { PageHeader } from "@/components/page-header";
import { emailRuntime } from "@/lib/email-runtime";
import { formatBytes, formatDateTime } from "@/lib/format";
import { requireOrgMember } from "@/lib/session";
import { SimulateReceivedEmailDialog } from "./received-forms";
import { canSimulateReceiving } from "./simulate";

export const metadata: Metadata = { title: "Received emails" };

const PAGE_SIZE = 50;

function single(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}

export default async function ReceivedEmailsPage({
  params,
  searchParams,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/received">) {
  const { orgSlug, projectSlug, envSlug } = await params;
  const search = await searchParams;
  const { organization, can } = await requireOrgMember(orgSlug);
  if (!can({ email: ["read"] })) notFound();
  const found = await getEnvironment({ organizationId: organization.id, projectSlug, envSlug });
  if (!found) notFound();
  const { project, environment } = found;
  const target = { organizationId: organization.id, environmentId: environment.id };
  const inbound = emailRuntime().inbound;

  const after = single(search.after);
  const query = ListReceivedEmailsQuery.safeParse({ after, limit: PAGE_SIZE });
  const [page, address, receivingDomains, dropped] = await Promise.all([
    query.success
      ? listReceivedEmails({ ...target, limit: PAGE_SIZE, after: query.data.after })
      : null,
    inbound ? inboundAddressFor(target, inbound.managedDomain) : null,
    listEnvironmentReceivingDomains(target),
    inboundDropCount(organization.id, new Date().toISOString().slice(0, 10)),
  ]);

  const base = `/${organization.slug}/projects/${project.slug}/${environment.slug}`;
  const listPath = `${base}/received`;
  const last = page?.data.at(-1);
  const nextPage =
    page?.hasMore && last ? `${listPath}?${new URLSearchParams({ after: last.id })}` : null;
  const formTarget = {
    orgSlug: organization.slug,
    projectSlug: project.slug,
    envSlug: environment.slug,
  };
  const simulate = address && can({ email: ["send"] }) && canSimulateReceiving(environment.mode);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link className="text-muted-foreground text-sm hover:text-foreground" href={base}>
          ← {project.name} · {environment.name}
        </Link>
        <PageHeader
          actions={
            simulate ? (
              <SimulateReceivedEmailDialog {...formTarget} defaultTo={`hello@${address.domain}`} />
            ) : null
          }
          description={`Emails sent to this environment's addresses. Each one also triggers an email.received webhook. Received emails are kept for ${formatRetentionDays(RETENTION_DAYS.receivedEmails)}.`}
          title="Received emails"
        />
      </div>

      {dropped > 0 ? (
        <Alert variant="warning">
          <AlertDescription>
            {dropped} {dropped === 1 ? "email was" : "emails were"} dropped today because the
            organization reached its daily limit of received emails. Contact support to raise it.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Addresses</CardTitle>
          <CardDescription>
            Email to any address at these domains is received here.{" "}
            <Link className="underline" href={`/${organization.slug}/domains`}>
              Add your own domain
            </Link>{" "}
            from a domain&apos;s page.
          </CardDescription>
        </CardHeader>
        <CardPanel className="p-2">
          {!inbound ? (
            <p className="p-4 text-muted-foreground text-sm">
              This deployment does not receive email.
            </p>
          ) : (
            <Table>
              <TableBody>
                {address ? (
                  <TableRow>
                    <TableCell className="font-mono text-sm">*@{address.domain}</TableCell>
                    <TableCell className="text-muted-foreground">COSS inbound address</TableCell>
                    <TableCell className="text-right">
                      <CopyButton label="Copy domain" value={address.domain} />
                    </TableCell>
                  </TableRow>
                ) : null}
                {receivingDomains.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm">*@{row.hostname}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <Link
                        className="underline"
                        href={`/${organization.slug}/domains/${row.domainId}`}
                      >
                        Your domain
                      </Link>{" "}
                      (MX {row.record.status.replaceAll("_", " ")})
                    </TableCell>
                    <TableCell className="text-right">
                      <CopyButton label="Copy domain" value={row.hostname} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
          <CardDescription>Newest first.</CardDescription>
          {after ? (
            <CardAction>
              <Button render={<Link href={listPath} />} size="sm" variant="outline">
                Newest
              </Button>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardPanel className="p-2">
          {!page ? (
            <p className="p-4 text-muted-foreground text-sm">Invalid page.</p>
          ) : page.data.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">No received emails yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Received</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.data.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(email.received_at)}
                    </TableCell>
                    <TableCell className="max-w-56 truncate">
                      {email.from ?? (email.mail_from || "—")}
                    </TableCell>
                    <TableCell className="max-w-56 truncate">
                      {email.recipients.join(", ")}
                    </TableCell>
                    <TableCell className="max-w-72 truncate">
                      <Link
                        className="font-medium underline-offset-4 hover:underline"
                        href={`${listPath}/${email.id}`}
                      >
                        {email.subject || "(no subject)"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <ReceivedStatusBadge status={email.status} />
                        {email.spam ? <Badge variant="warning">spam</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatBytes(email.size)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardPanel>
      </Card>

      {nextPage ? (
        <div className="flex gap-2">
          <Button render={<Link href={nextPage} />} size="sm" variant="outline">
            Older emails
          </Button>
        </div>
      ) : null}
    </div>
  );
}
