import { orgRoleCan } from "@coss/auth/permissions";
import { getEmailTenant, listDomains } from "@coss/email";
import { Card, CardPanel } from "@coss/ui/components/card";
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
import { DomainStatusBadge } from "@/components/domain-badges";
import { PageHeader } from "@/components/page-header";
import { SendingPausedAlert } from "@/components/sending-paused-alert";
import { formatDateTime } from "@/lib/format";
import { requireOrgMember } from "@/lib/session";
import { AddDomainDialog } from "./add-domain-dialog";

export const metadata: Metadata = { title: "Domains" };

export default async function DomainsPage({ params }: PageProps<"/[orgSlug]/domains">) {
  const { orgSlug } = await params;
  const { organization, member } = await requireOrgMember(orgSlug);
  if (!orgRoleCan(member.role, { domain: ["read"] })) notFound();
  const [domains, tenant] = await Promise.all([
    listDomains({ organizationId: organization.id }),
    getEmailTenant(organization.id),
  ]);
  const canCreate = orgRoleCan(member.role, { domain: ["create"] });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        actions={canCreate ? <AddDomainDialog orgSlug={organization.slug} /> : null}
        description="Live API keys can send from verified domains of this organization, in every project."
        title="Domains"
      />

      {tenant?.sendingStatus === "disabled" ? (
        <SendingPausedAlert cause={tenant.statusCause} />
      ) : null}

      <Card>
        <CardPanel className="p-2">
          {domains.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">
              No domains yet. Add one to send from your own address with live API keys.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last checked</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell className="font-medium">
                      <Link
                        className="hover:underline"
                        href={`/${organization.slug}/domains/${domain.id}`}
                      >
                        {domain.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <DomainStatusBadge status={domain.status} />
                    </TableCell>
                    <TableCell>{formatDateTime(domain.lastCheckedAt)}</TableCell>
                    <TableCell>{formatDateTime(domain.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardPanel>
      </Card>
    </div>
  );
}
