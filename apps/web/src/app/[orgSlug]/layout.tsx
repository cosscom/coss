import { getReputationStanding } from "@coss/reputation";
import { listUserOrganizations } from "@coss/tenancy";
import { Button } from "@coss/ui/components/button";
import Link from "next/link";
import { BillingBanner } from "@/components/billing/billing-banner";
import { OrgSwitcher } from "@/components/org-switcher";
import { ReputationBanner } from "@/components/reputation";
import { SiteHeader } from "@/components/site-header";
import { SsoBreakGlassAlert } from "@/components/sso-break-glass-alert";
import { SuspendedAlert } from "@/components/suspended-alert";
import { billingBannerState } from "@/lib/billing";
import { requireOrgMember } from "@/lib/session";

export default async function OrganizationLayout({ children, params }: LayoutProps<"/[orgSlug]">) {
  const { orgSlug } = await params;
  const { session, organization, suspended, ssoBreakGlass, can } = await requireOrgMember(orgSlug);
  const [organizations, standing, billing] = await Promise.all([
    listUserOrganizations({ userId: session.user.id }),
    getReputationStanding(organization.id),
    can({ billing: ["read"] }) ? billingBannerState(organization.id) : null,
  ]);
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
          <Button render={<Link href={`${base}/reputation`} />} size="sm" variant="ghost">
            Reputation
          </Button>
        </nav>
      </SiteHeader>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
        {standing ? <ReputationBanner href={`${base}/reputation`} standing={standing} /> : null}
        {suspended ? <SuspendedAlert /> : null}
        {billing ? <BillingBanner href={`${base}/settings/billing`} state={billing} /> : null}
        {ssoBreakGlass ? <SsoBreakGlassAlert orgSlug={organization.slug} /> : null}
        <div>{children}</div>
      </main>
    </div>
  );
}
