import { Button } from "@coss/ui/components/button";
import { headers } from "next/headers";
import Link from "next/link";
import { OrgSwitcher } from "@/components/org-switcher";
import { SiteHeader } from "@/components/site-header";
import { auth } from "@/lib/auth";
import { requireOrgMember } from "@/lib/session";

export default async function OrganizationLayout({ children, params }: LayoutProps<"/[orgSlug]">) {
  const { orgSlug } = await params;
  const { session, organization } = await requireOrgMember(orgSlug);
  const organizations = (await auth.api.listOrganizations({ headers: await headers() }))
    .map(({ name, slug }) => ({ name, slug }))
    .toSorted((a, b) => a.name.localeCompare(b.name));
  const base = `/${organization.slug}`;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader session={session}>
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
          <Button render={<Link href={`${base}/settings`} />} size="sm" variant="ghost">
            Settings
          </Button>
        </nav>
      </SiteHeader>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
