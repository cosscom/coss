import { getEnvironment } from "@coss/tenancy";
import { Card, CardPanel } from "@coss/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import { listLogDrains } from "@coss/webhooks";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModeBadge } from "@/components/email-badges";
import { PageHeader } from "@/components/page-header";
import { planHas } from "@/lib/billing";
import { formatDateTime } from "@/lib/format";
import { requireOrgMember } from "@/lib/session";
import { CreateDrainDialog } from "./create-drain-dialog";
import { DrainStatusBadge } from "./drain-status";
import { sourcesSummary } from "./sources";

export const metadata: Metadata = { title: "Log drains" };

export default async function LogDrainsPage({
  params,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/log-drains">) {
  const { orgSlug, projectSlug, envSlug } = await params;
  const { organization, can } = await requireOrgMember(orgSlug);
  if (!can({ logDrain: ["read"] })) notFound();
  const found = await getEnvironment({ organizationId: organization.id, projectSlug, envSlug });
  if (!found) notFound();
  const { project, environment } = found;
  const [drains, planAllows] = await Promise.all([
    listLogDrains({ organizationId: organization.id, environmentId: environment.id }),
    planHas(organization.id, "logDrains"),
  ]);
  const base = `/${organization.slug}/projects/${project.slug}/${environment.slug}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link className="text-muted-foreground text-sm hover:text-foreground" href={base}>
          ← {project.name} · {environment.name}
        </Link>
        <PageHeader
          actions={
            can({ logDrain: ["create"] }) && planAllows ? (
              <CreateDrainDialog
                envSlug={environment.slug}
                orgSlug={organization.slug}
                projectSlug={project.slug}
              />
            ) : null
          }
          description="Stream this environment's API requests, email events, webhook attempts and audit events to your own logging stack."
          title={
            <span className="flex items-center gap-2">
              Log drains <ModeBadge mode={environment.mode} />
            </span>
          }
        />
      </div>

      <Card>
        <CardPanel className="p-2">
          {drains.length === 0 && !planAllows ? (
            <p className="p-4 text-muted-foreground text-sm">
              Log drains are part of the Scale plan and above.{" "}
              <Link
                className="text-foreground underline"
                href={`/${organization.slug}/settings/billing/plans`}
              >
                Compare plans
              </Link>
            </p>
          ) : drains.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">
              No log drains yet. Add one to send this environment's logs to an HTTPS endpoint you
              run, as they are written.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Sources</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drains.map((drain) => (
                  <TableRow key={drain.id}>
                    <TableCell className="max-w-80 truncate font-medium">
                      <Link className="hover:underline" href={`${base}/log-drains/${drain.id}`}>
                        {drain.url}
                      </Link>
                      {drain.description ? (
                        <div className="truncate text-muted-foreground text-xs">
                          {drain.description}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {sourcesSummary(drain.sources)}
                    </TableCell>
                    <TableCell>
                      <DrainStatusBadge drain={drain} />
                    </TableCell>
                    <TableCell>{formatDateTime(drain.createdAt)}</TableCell>
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
