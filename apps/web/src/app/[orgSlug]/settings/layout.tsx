import { PageHeader } from "@/components/page-header";
import { SubNav } from "@/components/sub-nav";
import { requireOrgMember } from "@/lib/session";

/** Organization settings: the title and the tabs (General, Billing, SSO, Directory sync, Audit). */
export default async function OrganizationSettingsLayout({
  children,
  params,
}: LayoutProps<"/[orgSlug]/settings">) {
  const { orgSlug } = await params;
  const { organization, can } = await requireOrgMember(orgSlug);
  // Tabs the member may open; the pages re-check.
  const paths = [
    "",
    ...(can({ billing: ["read"] }) ? ["/billing"] : []),
    ...(can({ sso: ["read"] }) ? ["/sso"] : []),
    ...(can({ scim: ["read"] }) ? ["/scim"] : []),
    ...(can({ audit: ["read"] }) ? ["/audit"] : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <PageHeader description={`Manage ${organization.name}.`} title="Settings" />
        <SubNav
          base={`/${organization.slug}/settings`}
          className="border-b"
          nav="organizationSettings"
          paths={paths}
        />
      </div>
      {children}
    </div>
  );
}
