import { DASHBOARD_PATH } from "@coss/auth/slugs";
import { AppShell } from "@/components/shell/app-shell";
import { AreaSidebar } from "@/components/shell/area-sidebar";
import { requirePlatformAdmin } from "@/lib/session";

/**
 * Platform admin console. Non-admins get a 404 so its existence isn't revealed. Next renders
 * layouts and pages in parallel, so every admin page must call `requirePlatformAdmin()` too.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { session } = await requirePlatformAdmin();
  const user = { name: session.user.name, email: session.user.email, isAdmin: true };

  return (
    <AppShell
      command={{ isAdmin: true }}
      names={{ "/admin": "Admin" }}
      session={session}
      sidebar={
        <AreaSidebar
          area="admin"
          back={{ href: DASHBOARD_PATH, label: "Dashboard" }}
          label="admin"
          user={user}
        />
      }
    >
      {children}
    </AppShell>
  );
}
