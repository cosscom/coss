import { orgRoleCan } from "@coss/auth/permissions";
import { WEBHOOK_EVENT_TYPES } from "@coss/email/schemas";
import { getEnvironment } from "@coss/tenancy";
import { Badge } from "@coss/ui/components/badge";
import { Card, CardPanel } from "@coss/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import { listWebhookEndpoints } from "@coss/webhooks";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModeBadge } from "@/components/email-badges";
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/format";
import { requireOrgMember } from "@/lib/session";
import { CreateEndpointDialog } from "./create-endpoint-dialog";

export const metadata: Metadata = { title: "Webhooks" };

export default async function WebhooksPage({
  params,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/webhooks">) {
  const { orgSlug, projectSlug, envSlug } = await params;
  const { organization, member } = await requireOrgMember(orgSlug);
  if (!orgRoleCan(member.role, { webhook: ["read"] })) notFound();
  const found = await getEnvironment({ organizationId: organization.id, projectSlug, envSlug });
  if (!found) notFound();
  const { project, environment } = found;
  const endpoints = await listWebhookEndpoints({
    organizationId: organization.id,
    environmentId: environment.id,
  });
  const base = `/${organization.slug}/projects/${project.slug}/${environment.slug}`;
  const canCreate = orgRoleCan(member.role, { webhook: ["create"] });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link className="text-muted-foreground text-sm hover:text-foreground" href={base}>
          ← {project.name} · {environment.name}
        </Link>
        <PageHeader
          actions={
            canCreate ? (
              <CreateEndpointDialog
                envSlug={environment.slug}
                eventTypes={WEBHOOK_EVENT_TYPES}
                orgSlug={organization.slug}
                projectSlug={project.slug}
              />
            ) : null
          }
          description="Signed notifications of email delivery events and reputation changes in this environment."
          title={
            <span className="flex items-center gap-2">
              Webhooks <ModeBadge mode={environment.mode} />
            </span>
          }
        />
      </div>

      <Card>
        <CardPanel className="p-2">
          {endpoints.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">
              No endpoints yet. Add one to be notified when emails are delivered, bounce or receive
              complaints.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {endpoints.map((endpoint) => (
                  <TableRow key={endpoint.id}>
                    <TableCell className="max-w-80 truncate font-medium">
                      <Link className="hover:underline" href={`${base}/webhooks/${endpoint.id}`}>
                        {endpoint.url}
                      </Link>
                      {endpoint.description ? (
                        <div className="truncate text-muted-foreground text-xs">
                          {endpoint.description}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {endpoint.eventTypes.length === 0 ? "All" : endpoint.eventTypes.length}
                    </TableCell>
                    <TableCell>
                      {endpoint.enabled ? (
                        <Badge variant="success">Enabled</Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDateTime(endpoint.createdAt)}</TableCell>
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
