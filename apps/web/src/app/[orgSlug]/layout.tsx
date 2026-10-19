import { listBudgetHolds } from "@coss/billing";
import { getReputationStanding } from "@coss/reputation";
import { listUserOrganizations } from "@coss/tenancy";
import { Alert, AlertDescription } from "@coss/ui/components/alert";
import Link from "next/link";
import { BillingBanner } from "@/components/billing/billing-banner";
import { ReputationBanner } from "@/components/reputation";
import { AppShell } from "@/components/shell/app-shell";
import { OrgSidebar } from "@/components/shell/org-sidebar";
import type { ShellProject } from "@/components/shell/types";
import { SsoBreakGlassAlert } from "@/components/sso-break-glass-alert";
import { SuspendedAlert } from "@/components/suspended-alert";
import { avatarUrl } from "@/lib/avatars";
import { billingBannerState } from "@/lib/billing";
import { environmentPath } from "@/lib/navigation";
import { listProjectsWithDefaultEnvironment } from "@/lib/projects";
import { isPlatformAdmin, requireOrgMember } from "@/lib/session";

export default async function OrganizationLayout({ children, params }: LayoutProps<"/[orgSlug]">) {
  const { orgSlug } = await params;
  const { session, organization, member, suspended, ssoBreakGlass, can } =
    await requireOrgMember(orgSlug);
  const [organizations, projectRows, standing, billing, budgetHolds] = await Promise.all([
    listUserOrganizations({ userId: session.user.id }),
    listProjectsWithDefaultEnvironment(organization.id),
    getReputationStanding(organization.id),
    can({ billing: ["read"] }) ? billingBannerState(organization.id) : null,
    listBudgetHolds(organization.id),
  ]);
  // The member's own personal keys over their budget (billing readers see every budget on Spend).
  const ownBudgetPaused = budgetHolds.some(
    (hold) => hold.scope === "user" && hold.targetId === session.user.id,
  );
  const base = `/${organization.slug}`;
  const projects: ShellProject[] = projectRows.map(
    ({ project, environments, defaultEnvironment }) => ({
      name: project.name,
      slug: project.slug,
      environments: environments.map((env) => ({ name: env.name, slug: env.slug, mode: env.mode })),
      defaultEnvironment: defaultEnvironment?.slug,
    }),
  );
  const orgs = organizations.map((org) => ({ name: org.name, slug: org.slug }));
  const current = { name: organization.name, slug: organization.slug };
  const user = {
    name: session.user.name,
    email: session.user.email,
    image: avatarUrl(session.user),
    isAdmin: isPlatformAdmin(session),
  };

  // Breadcrumb labels for the dynamic segments: the organization, its projects and environments.
  const names: Record<string, string> = { [base]: organization.name };
  for (const project of projects) {
    names[`${base}/projects/${project.slug}`] = project.name;
    for (const env of project.environments) {
      names[environmentPath(organization.slug, project.slug, env.slug)] = env.name;
    }
  }

  return (
    <AppShell
      banners={
        standing || suspended || billing || ssoBreakGlass || ownBudgetPaused ? (
          <div className="flex flex-col gap-3">
            {standing ? <ReputationBanner href={`${base}/reputation`} standing={standing} /> : null}
            {suspended ? <SuspendedAlert /> : null}
            {billing ? <BillingBanner href={`${base}/settings/billing`} state={billing} /> : null}
            {ownBudgetPaused ? (
              <Alert variant="error">
                <AlertDescription>
                  Your personal API keys reached your monthly budget: their live sends are paused
                  until next month or until an owner raises it.{" "}
                  <Link className="underline" href={`${base}/spend`}>
                    Your spend
                  </Link>
                </AlertDescription>
              </Alert>
            ) : null}
            {ssoBreakGlass ? <SsoBreakGlassAlert orgSlug={organization.slug} /> : null}
          </div>
        ) : null
      }
      command={{ organization: current, organizations: orgs, projects, isAdmin: user.isAdmin }}
      names={names}
      session={session}
      sidebar={
        <OrgSidebar
          organization={{ ...current, role: member.role }}
          organizations={orgs}
          projects={projects}
          user={user}
        />
      }
    >
      {children}
    </AppShell>
  );
}
