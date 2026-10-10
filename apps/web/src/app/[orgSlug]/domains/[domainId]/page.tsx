import { type DomainRecord, domainRecords, getDomain, getEmailTenant } from "@coss/email";
import { Alert, AlertDescription } from "@coss/ui/components/alert";
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
import { CopyButton } from "@/components/copy-button";
import { DomainStatusBadge, RecordStatusBadge } from "@/components/domain-badges";
import { PageHeader } from "@/components/page-header";
import { SendingPausedAlert } from "@/components/sending-paused-alert";
import { formatDateTime } from "@/lib/format";
import { requireOrgMember } from "@/lib/session";
import { DeleteDomainButton, VerifyDomainButton } from "./domain-actions";

export const metadata: Metadata = { title: "Domain" };

const PURPOSE: Record<DomainRecord["purpose"], string> = {
  dkim: "DKIM: proves emails from this domain are really from you.",
  mail_from_mx: "MAIL FROM: receives bounces and complaints.",
  mail_from_spf: "SPF: authorizes the provider to send for the MAIL FROM subdomain.",
  dmarc: "DMARC (recommended): tells mailbox providers what to do with unauthenticated mail.",
};

const STATUS_HELP = {
  pending:
    "Publish the records below at your DNS provider. Verification usually takes a few minutes, " +
    "sometimes up to 72 hours; we check automatically.",
  verified: "Live API keys can send from any address at this domain.",
  temporary_failure:
    "The DKIM records can't be found right now. Sending is blocked until they are back.",
  failed:
    "The records weren't found within 72 hours, so verification stopped. Restart it to get new " +
    "records to publish.",
  deleting: "This domain is being removed.",
} as const;

/** DNS providers usually want the host relative to the zone; showing the full name is clearest. */
function RecordRow({ record }: { record: DomainRecord }) {
  const value = record.priority === null ? record.value : `${record.priority} ${record.value}`;
  return (
    <TableRow>
      <TableCell className="align-top font-mono text-xs">{record.type}</TableCell>
      <TableCell className="min-w-0 whitespace-normal align-top leading-normal">
        <div className="flex flex-col gap-1">
          <code className="break-all text-xs">{record.name}</code>
          <span className="text-muted-foreground text-xs">{PURPOSE[record.purpose]}</span>
          <div>
            <CopyButton label="Copy name" value={record.name} />
          </div>
        </div>
      </TableCell>
      <TableCell className="min-w-0 whitespace-normal align-top leading-normal">
        <div className="flex flex-col gap-1">
          <code className="break-all text-xs">{value}</code>
          {record.found.length > 0 ? (
            <span className="break-all text-destructive-foreground text-xs">
              Found: {record.found.join(", ")}
            </span>
          ) : null}
          <div>
            <CopyButton label="Copy value" value={record.value} />
          </div>
        </div>
      </TableCell>
      <TableCell className="align-top">
        <RecordStatusBadge status={record.status} />
      </TableCell>
    </TableRow>
  );
}

export default async function DomainPage({ params }: PageProps<"/[orgSlug]/domains/[domainId]">) {
  const { orgSlug, domainId } = await params;
  const { organization, can } = await requireOrgMember(orgSlug);
  if (!can({ domain: ["read"] })) notFound();
  const [domain, tenant] = await Promise.all([
    getDomain({ organizationId: organization.id, id: domainId }),
    getEmailTenant(organization.id),
  ]);
  if (!domain) notFound();
  const records = domainRecords(domain);
  const canVerify = can({ domain: ["verify"] });
  const canDelete = can({ domain: ["delete"] });
  const target = { orgSlug: organization.slug, domainId: domain.id };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          className="text-muted-foreground text-sm hover:text-foreground"
          href={`/${organization.slug}/domains`}
        >
          ← Domains
        </Link>
        <PageHeader
          actions={
            <>
              {canVerify && domain.status !== "deleting" ? (
                <VerifyDomainButton {...target} restart={domain.status === "failed"} />
              ) : null}
              {canDelete && domain.status !== "deleting" ? (
                <DeleteDomainButton {...target} name={domain.name} />
              ) : null}
            </>
          }
          description={STATUS_HELP[domain.status]}
          title={
            <span className="flex items-center gap-3">
              {domain.name} <DomainStatusBadge status={domain.status} />
            </span>
          }
        />
      </div>

      {tenant?.sendingStatus === "disabled" ? (
        <SendingPausedAlert cause={tenant.statusCause} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>DNS records</CardTitle>
          <CardDescription>
            Add these at your DNS provider. Last checked {formatDateTime(domain.lastCheckedAt)}.
          </CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-3 p-2">
          {domain.provider === "fake" ? (
            <Alert variant="info">
              <AlertDescription>
                This domain uses the fake email provider (local development): it verifies without
                DNS, and these records are not checked.
              </AlertDescription>
            </Alert>
          ) : null}
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Value</TableHead>
                <TableHead className="w-28">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <RecordRow key={`${record.type} ${record.name} ${record.value}`} record={record} />
              ))}
            </TableBody>
          </Table>
        </CardPanel>
      </Card>

      <Card>
        <CardPanel className="p-2">
          <Table>
            <TableBody>
              <TableRow>
                <TableHead className="w-40">MAIL FROM domain</TableHead>
                <TableCell>
                  <code>{domain.mailFromDomain}</code> ({domain.mailFromStatus.replaceAll("_", " ")}
                  )
                </TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Verified</TableHead>
                <TableCell>{formatDateTime(domain.verifiedAt)}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Added</TableHead>
                <TableCell>{formatDateTime(domain.createdAt)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardPanel>
      </Card>
    </div>
  );
}
