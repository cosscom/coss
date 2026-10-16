import {
  DEFAULT_REPUTATION_POLICY,
  getOrganizationStanding,
  listReputationEvents,
  ReputationPolicyOverrides,
} from "@coss/reputation";
import { listScreenings } from "@coss/screening";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminOrganizationTabs } from "@/components/admin/organization-tabs";
import { PageHeader } from "@/components/page-header";
import {
  ReputationChecks,
  ReputationHistory,
  StandingBadge,
  triggerLabel,
} from "@/components/reputation";
import { formatDateTime } from "@/lib/format";
import { requirePlatformAdmin } from "@/lib/session";
import { isSystemOrganization } from "@/lib/system-organization";
import { ContentScreenings } from "./screenings";
import { PolicyForm, ReinstateButton, SuspendButton } from "./standing-actions";

export const metadata: Metadata = { title: "Organization" };

export default async function AdminOrganizationPage({
  params,
}: PageProps<"/admin/organizations/[organizationId]/reputation">) {
  await requirePlatformAdmin();
  const { organizationId } = await params;
  const organization = await getOrganizationStanding(organizationId);
  if (!organization) notFound();
  const [events, screenings] = await Promise.all([
    listReputationEvents(organization.organizationId, { limit: 100 }),
    listScreenings(organization.organizationId, { limit: 50 }),
  ]);
  const { standing } = organization;
  const isSystem = await isSystemOrganization(organization.organizationId);
  const overrides = ReputationPolicyOverrides.safeParse(standing?.policyOverrides ?? {});

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <PageHeader
          actions={
            standing?.status === "suspended" ? (
              <ReinstateButton organizationId={organization.organizationId} />
            ) : isSystem ? (
              <span className="text-muted-foreground text-sm">
                coss.com's own organization: can't be suspended
              </span>
            ) : (
              <SuspendButton organizationId={organization.organizationId} />
            )
          }
          description={`created ${formatDateTime(organization.createdAt)}`}
          meta={
            <>
              <StandingBadge status={standing?.status ?? "good"} />
              <code className="font-mono text-xs">/{organization.slug}</code>
              <code className="font-mono text-xs">{organization.organizationId}</code>
            </>
          }
          title={organization.name}
        />
        <AdminOrganizationTabs organizationId={organization.organizationId} />
        {standing && standing.status !== "good" ? (
          <p className="text-muted-foreground text-sm">
            {triggerLabel(standing.reason)} since {formatDateTime(standing.statusChangedAt)}.
            {standing.reinstatedAt
              ? ` Last reinstated ${formatDateTime(standing.reinstatedAt)}.`
              : ""}
          </p>
        ) : null}
      </div>
      <ReputationChecks standing={standing} />
      <ContentScreenings screenings={screenings} />
      <PolicyForm
        defaults={DEFAULT_REPUTATION_POLICY}
        organizationId={organization.organizationId}
        overrides={overrides.success ? overrides.data : null}
      />
      <ReputationHistory events={events} showInternal />
    </div>
  );
}
