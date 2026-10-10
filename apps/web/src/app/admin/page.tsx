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
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SignOutButton } from "@/components/sign-out-button";
import { auth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { isPlatformAdmin, requireSession } from "@/lib/session";
import { UserActions } from "./user-actions";

export const metadata: Metadata = { title: "Admin" };

/** Platform admin console. Non-admins get a 404 so the page's existence isn't revealed. */
export default async function AdminPage() {
  const session = await requireSession();
  if (!isPlatformAdmin(session)) notFound();

  const { users, total } = await auth.api.listUsers({
    headers: await headers(),
    query: { limit: 100, sortBy: "createdAt", sortDirection: "desc" },
  });

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
          <Link className="font-semibold" href="/">
            COSS
          </Link>
          <Button render={<Link href="/" />} size="sm" variant="ghost">
            Dashboard
          </Button>
          <div className="ms-auto flex items-center gap-2">
            <span className="text-muted-foreground text-sm">{session.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <PageHeader
          description={`${total} user${total === 1 ? "" : "s"}${total > users.length ? ` (showing the newest ${users.length})` : ""}.`}
          title="Users"
        />
        <Card>
          <CardPanel className="p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>
                      {user.email}
                      {user.emailVerified ? null : (
                        <Badge className="ms-2" variant="warning">
                          unverified
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "info" : "outline"}>
                        {user.role ?? "user"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.banned ? (
                        <Badge variant="error">banned</Badge>
                      ) : (
                        <Badge variant="success">active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.id === session.user.id ? (
                        <span className="text-muted-foreground text-sm">You</span>
                      ) : (
                        <UserActions
                          banned={Boolean(user.banned)}
                          isAdmin={user.role === "admin"}
                          userId={user.id}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardPanel>
        </Card>
      </main>
    </div>
  );
}
