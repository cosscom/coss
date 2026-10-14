import { listRiskListEntries } from "@coss/risk";
import { ListRiskListEntriesQuery } from "@coss/risk/schemas";
import { getEnvironment } from "@coss/tenancy";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
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
import { ModeBadge } from "@/components/email-badges";
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/format";
import { requireOrgMember } from "@/lib/session";
import { AddRiskListEntryDialog } from "./add-list-entry-dialog";
import { RemoveRiskListEntryButton } from "./remove-list-entry-button";

export const metadata: Metadata = { title: "Allow & block lists" };

const PAGE_SIZE = 50;

function single(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}

export default async function RiskListsPage({
  params,
  searchParams,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/risk/lists">) {
  const { orgSlug, projectSlug, envSlug } = await params;
  const search = await searchParams;
  const { organization, can } = await requireOrgMember(orgSlug);
  if (!can({ riskList: ["read"] })) notFound();
  const found = await getEnvironment({ organizationId: organization.id, projectSlug, envSlug });
  if (!found) notFound();
  const { project, environment } = found;

  const after = single(search.after);
  const query = ListRiskListEntriesQuery.safeParse({ after, limit: PAGE_SIZE });
  const page = query.success
    ? await listRiskListEntries(
        { organizationId: organization.id, environmentId: environment.id },
        query.data,
      )
    : null;

  const riskPath = `/${organization.slug}/projects/${project.slug}/${environment.slug}/risk`;
  const listPath = `${riskPath}/lists`;
  const target = {
    orgSlug: organization.slug,
    projectSlug: project.slug,
    envSlug: environment.slug,
  };
  const canDelete = can({ riskList: ["delete"] });
  const now = new Date();
  const last = page?.data.at(-1);
  const nextPage = page?.has_more && last ? `${listPath}?after=${last.id}` : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link className="text-muted-foreground text-sm hover:text-foreground" href={riskPath}>
          ← Risk
        </Link>
        <PageHeader
          actions={can({ riskList: ["create"] }) ? <AddRiskListEntryDialog {...target} /> : null}
          description="Email addresses, domains, IP ranges, networks, countries and users whose assessments in this environment are always allowed or always blocked."
          title={
            <span className="flex items-center gap-2">
              Allow &amp; block lists <ModeBadge mode={environment.mode} />
            </span>
          }
        />
      </div>

      <Card>
        <CardPanel className="p-2">
          {!page || page.data.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">
              {after ? "No more entries." : "No entries yet."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>List</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Added</TableHead>
                  {canDelete ? <TableHead className="w-0" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <Badge variant={entry.list === "block" ? "error" : "success"}>
                          {entry.list}
                        </Badge>
                        {entry.expires_at && new Date(entry.expires_at) <= now ? (
                          <Badge variant="outline">expired</Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell>{entry.type}</TableCell>
                    <TableCell className="max-w-80 truncate font-medium">{entry.value}</TableCell>
                    <TableCell className="max-w-64 truncate text-muted-foreground">
                      {entry.note ?? "—"}
                    </TableCell>
                    <TableCell>{formatDateTime(entry.created_at)}</TableCell>
                    {canDelete ? (
                      <TableCell>
                        <RemoveRiskListEntryButton
                          {...target}
                          entryId={entry.id}
                          list={entry.list}
                          value={entry.value}
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardPanel>
      </Card>

      {after || nextPage ? (
        <div className="flex gap-2">
          {after ? (
            <Button render={<Link href={listPath} />} size="sm" variant="outline">
              First page
            </Button>
          ) : null}
          {nextPage ? (
            <Button render={<Link href={nextPage} />} size="sm" variant="outline">
              Next page
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
