import { Button } from "@coss/ui/components/button";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { requirePlatformAdmin } from "@/lib/session";

/**
 * Platform admin console. Non-admins get a 404 so its existence isn't revealed. Next renders
 * layouts and pages in parallel, so every admin page must call `requirePlatformAdmin()` too.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { session } = await requirePlatformAdmin();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
          <Link className="font-semibold" href="/admin">
            COSS <span className="font-normal text-muted-foreground">admin</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Button render={<Link href="/admin" />} size="sm" variant="ghost">
              Overview
            </Button>
            <Button render={<Link href="/admin/users" />} size="sm" variant="ghost">
              Users
            </Button>
            <Button render={<Link href="/admin/organizations" />} size="sm" variant="ghost">
              Organizations
            </Button>
            <Button render={<Link href="/admin/audit" />} size="sm" variant="ghost">
              Audit log
            </Button>
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <Button render={<Link href="/" />} size="sm" variant="ghost">
              Dashboard
            </Button>
            <span className="text-muted-foreground text-sm">{session.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">{children}</main>
    </div>
  );
}
