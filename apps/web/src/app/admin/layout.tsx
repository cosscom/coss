import { Button } from "@coss/ui/components/button";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { requirePlatformAdmin } from "@/lib/session";

/** Platform admin console. Non-admins get a 404 so its existence isn't revealed. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await requirePlatformAdmin();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
          <Link className="font-semibold" href="/">
            COSS
          </Link>
          <nav className="flex items-center gap-1">
            <Button render={<Link href="/" />} size="sm" variant="ghost">
              Dashboard
            </Button>
            <Button render={<Link href="/admin" />} size="sm" variant="ghost">
              Users
            </Button>
            <Button render={<Link href="/admin/organizations" />} size="sm" variant="ghost">
              Organizations
            </Button>
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <span className="text-muted-foreground text-sm">{session.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">{children}</main>
    </div>
  );
}
