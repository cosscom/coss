import { listOrganizationsForAdmin } from "@coss/tenancy/admin";
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
import {
  ADMIN_PAGE_SIZE,
  ListFilters,
  listHref,
  Pager,
  pageParam,
  stringParam,
} from "@/components/admin/list-controls";
import { OrganizationStatusBadge } from "@/components/admin/status-badges";
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/format";
import { requirePlatformAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Organizations · Admin" };

const STATUSES = [
  { value: "all", label: "All" },
  { value: "suspended", label: "Suspended" },
];

export default async function AdminOrganizationsPage({
  searchParams,
}: PageProps<"/admin/organizations">) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const query = stringParam(params.q);
  const status = stringParam(params.status) === "suspended" ? "suspended" : "all";
  const page = pageParam(params.page);
  const { organizations, total } = await listOrganizationsForAdmin({
    search: query,
    suspendedOnly: status === "suspended",
    limit: ADMIN_PAGE_SIZE,
    offset: (page - 1) * ADMIN_PAGE_SIZE,
  });

  return (
    <>
      <PageHeader description="Every organization on the platform." title="Organizations" />
      <ListFilters
        path="/admin/organizations"
        placeholder="Search by name, slug or organization id"
        query={query}
        status={status}
        statuses={STATUSES}
      />
      <Card>
        <CardPanel className="p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((organization) => (
                <TableRow key={organization.id}>
                  <TableCell className="font-medium">
                    <Link
                      className="hover:underline"
                      href={`/admin/organizations/${organization.id}`}
                    >
                      {organization.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{organization.slug}</TableCell>
                  <TableCell className="tabular-nums">{organization.memberCount}</TableCell>
                  <TableCell>
                    <OrganizationStatusBadge suspended={organization.suspendedAt !== null} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(organization.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardPanel>
      </Card>
      <Pager
        hrefFor={(target) =>
          listHref("/admin/organizations", {
            q: query,
            status: status === "all" ? undefined : status,
            page: target,
          })
        }
        page={page}
        shown={organizations.length}
        total={total}
      />
    </>
  );
}
