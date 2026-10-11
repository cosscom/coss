import {
  DEFAULT_REPUTATION_POLICY,
  getOrganizationStanding,
  listReputationEvents,
  ReputationPolicyOverrides,
} from "@coss/reputation";
import { listScreenings } from "@coss/screening";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import {
  ReputationChecks,
  ReputationHistory,
  StandingBadge,
  triggerLabel,
} from "@/components/reputation";
import { formatDateTime } from "@/lib/format";
import { requirePlatformAdmin } from "@/lib/session";
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
  const overrides = ReputationPolicyOverrides.safeParse(standing?.policyOverrides ?? {});

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          className="text-muted-foreground text-sm hover:text-foreground"
          href="/admin/organizations"
        >
          ← Organizations
        </Link>
        <PageHeader
          actions={
            standing?.status === "suspended" ? (
              <ReinstateButton organizationId={organization.organizationId} />
            ) : (
              <SuspendButton organizationId={organization.organizationId} />
            )
          }
          description={`${organization.slug} · ${organization.organizationId} · created ${formatDateTime(organization.createdAt)}`}
          title={
            <span className="flex items-center gap-3">
              {organization.name} <StandingBadge status={standing?.status ?? "good"} />
            </span>
          }
        />
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
