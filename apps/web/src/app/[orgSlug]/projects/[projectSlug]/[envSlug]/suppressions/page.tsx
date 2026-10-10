import { listSuppressions } from "@coss/email";
import { ListSuppressionsQuery } from "@coss/email/schemas";
import { getEnvironment } from "@coss/tenancy";
import { Button } from "@coss/ui/components/button";
import { Card, CardPanel } from "@coss/ui/components/card";
import { Input } from "@coss/ui/components/input";
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
import {
  ModeBadge,
  SuppressionReasonBadge,
  SuppressionScopeBadge,
} from "@/components/email-badges";
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/format";
import { requireOrgMember } from "@/lib/session";
import { AddSuppressionDialog } from "./add-suppression-dialog";
import { RemoveSuppressionButton } from "./remove-suppression-button";

export const metadata: Metadata = { title: "Suppressions" };

const PAGE_SIZE = 50;

function single(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}

export default async function SuppressionsPage({
  params,
  searchParams,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/suppressions">) {
  const { orgSlug, projectSlug, envSlug } = await params;
  const search = await searchParams;
  const { organization, can } = await requireOrgMember(orgSlug);
  if (!can({ suppression: ["read"] })) notFound();
  const found = await getEnvironment({ organizationId: organization.id, projectSlug, envSlug });
  if (!found) notFound();
  const { project, environment } = found;

  const address = single(search.address);
  const after = single(search.after);
  const query = ListSuppressionsQuery.safeParse({ address, after, limit: PAGE_SIZE });
  const page = query.success
    ? await listSuppressions(
        { organizationId: organization.id, environmentId: environment.id },
        query.data,
      )
    : null;

  const base = `/${organization.slug}/projects/${project.slug}/${environment.slug}`;
  const listPath = `${base}/suppressions`;
  const target = {
    orgSlug: organization.slug,
    projectSlug: project.slug,
    envSlug: environment.slug,
  };
  const canCreate = can({ suppression: ["create"] });
  const canDelete = can({ suppression: ["delete"] });
  const last = page?.data.at(-1);
  const nextPage =
    page?.has_more && last
      ? `${listPath}?${new URLSearchParams({ ...(address ? { address } : {}), after: last.id })}`
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link className="text-muted-foreground text-sm hover:text-foreground" href={base}>
          ← {project.name} · {environment.name}
        </Link>
        <PageHeader
          actions={canCreate ? <AddSuppressionDialog {...target} /> : null}
          description="Emails from this environment skip these addresses. Permanent bounces and complaints are added automatically; entries for a category only apply to emails sent with that category."
          title={
            <span className="flex items-center gap-2">
              Suppressions <ModeBadge mode={environment.mode} />
            </span>
          }
        />
      </div>

      <form action={listPath} className="flex max-w-md gap-2">
        <Input
          aria-label="Email address"
          defaultValue={address}
          name="address"
          placeholder="Find an address"
          type="email"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
        {address ? (
          <Button render={<Link href={listPath} />} variant="ghost">
            Clear
          </Button>
        ) : null}
      </form>

      <Card>
        <CardPanel className="p-2">
          {!page ? (
            <p className="p-4 text-muted-foreground text-sm">Enter a valid email address.</p>
          ) : page.data.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">
              {address
                ? "This address is not suppressed."
                : after
                  ? "No more suppressions."
                  : "No suppressed addresses yet."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Added</TableHead>
                  {canDelete ? <TableHead className="w-0" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.data.map((suppression) => (
                  <TableRow key={suppression.id}>
                    <TableCell className="max-w-80 truncate font-medium">
                      {suppression.address}
                    </TableCell>
                    <TableCell>
                      <SuppressionScopeBadge scope={suppression.scope} />
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <SuppressionReasonBadge reason={suppression.reason} />
                        {suppression.email_id ? (
                          <Link
                            className="text-muted-foreground text-xs hover:underline"
                            href={`${base}/emails/${suppression.email_id}`}
                          >
                            View email
                          </Link>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell>{formatDateTime(suppression.created_at)}</TableCell>
                    {canDelete ? (
                      <TableCell>
                        <RemoveSuppressionButton
                          {...target}
                          address={suppression.address}
                          scope={suppression.scope}
                          suppressionId={suppression.id}
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
            <Button
              render={
                <Link
                  href={address ? `${listPath}?${new URLSearchParams({ address })}` : listPath}
                />
              }
              size="sm"
              variant="outline"
            >
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
