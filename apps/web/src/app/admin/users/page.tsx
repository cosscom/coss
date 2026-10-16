import { type AdminUserStatus, listUsersForAdmin } from "@coss/tenancy/admin";
import { Badge } from "@coss/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import { UsersIcon } from "lucide-react";
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
import { PlatformRoleBadge, UserStatusBadge } from "@/components/admin/status-badges";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelBody } from "@/components/panel";
import { formatDateTime } from "@/lib/format";
import { requirePlatformAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Users · Admin" };

const STATUSES = [
  { value: "all", label: "All" },
  { value: "banned", label: "Banned" },
  { value: "admin", label: "Admins" },
] as const;

function statusParam(value: string): AdminUserStatus {
  return value === "banned" || value === "admin" ? value : "all";
}

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const query = stringParam(params.q);
  const status = statusParam(stringParam(params.status));
  const page = pageParam(params.page);
  const { users, total } = await listUsersForAdmin({
    search: query,
    status,
    limit: ADMIN_PAGE_SIZE,
    offset: (page - 1) * ADMIN_PAGE_SIZE,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader description="Everyone with a coss.com account." title="Users" />
      <ListFilters
        path="/admin/users"
        placeholder="Search by email, name or user id"
        query={query}
        status={status}
        statuses={[...STATUSES]}
      />
      <Panel
        footer={
          <Pager
            hrefFor={(target) =>
              listHref("/admin/users", {
                q: query,
                status: status === "all" ? undefined : status,
                page: target,
              })
            }
            page={page}
            shown={users.length}
            total={total}
          />
        }
      >
        {users.length === 0 ? (
          <PanelBody flush>
            <EmptyState
              compact
              description="No user matches these filters."
              icon={UsersIcon}
              title="No users found"
            />
          </PanelBody>
        ) : (
          <Table variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <Link className="hover:underline" href={`/admin/users/${user.id}`}>
                      {user.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {user.email}
                    {user.emailVerified ? null : (
                      <Badge className="ms-2" variant="warning">
                        unverified
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <PlatformRoleBadge role={user.role} />
                  </TableCell>
                  <TableCell>
                    <UserStatusBadge banned={user.banned} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(user.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
