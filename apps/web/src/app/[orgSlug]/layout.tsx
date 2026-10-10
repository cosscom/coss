import { Button } from "@coss/ui/components/button";
import { headers } from "next/headers";
import Link from "next/link";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { OrgSwitcher } from "@/components/org-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { auth } from "@/lib/auth";
import { isPlatformAdmin, requireOrgMember } from "@/lib/session";

export default async function OrganizationLayout({ children, params }: LayoutProps<"/[orgSlug]">) {
  const { orgSlug } = await params;
  const { session, organization } = await requireOrgMember(orgSlug);
  const organizations = (await auth.api.listOrganizations({ headers: await headers() }))
    .map(({ name, slug }) => ({ name, slug }))
    .toSorted((a, b) => a.name.localeCompare(b.name));
  const base = `/${organization.slug}`;

  return (
    <div className="flex min-h-dvh flex-col">
      {session.session.impersonatedBy ? <ImpersonationBanner email={session.user.email} /> : null}
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
          <Link className="font-semibold" href={base}>
            COSS
          </Link>
          <OrgSwitcher
            current={{ name: organization.name, slug: organization.slug }}
            organizations={organizations}
          />
          <nav className="flex items-center gap-1">
            <Button render={<Link href={base} />} size="sm" variant="ghost">
              Projects
            </Button>
            <Button render={<Link href={`${base}/domains`} />} size="sm" variant="ghost">
              Domains
            </Button>
            <Button render={<Link href={`${base}/members`} />} size="sm" variant="ghost">
              Members
            </Button>
            {isPlatformAdmin(session) ? (
              <Button render={<Link href="/admin" />} size="sm" variant="ghost">
                Admin
              </Button>
            ) : null}
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <span className="text-muted-foreground text-sm">{session.user.email}</span>
            <Button render={<Link href="/settings" />} size="sm" variant="ghost">
              Account
            </Button>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
