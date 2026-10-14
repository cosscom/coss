import { getRiskSettings } from "@coss/risk";
import { DISABLEABLE_REASON_CODES, REASONS } from "@coss/risk/schemas";
import { getEnvironment } from "@coss/tenancy";
import { Card, CardPanel } from "@coss/ui/components/card";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModeBadge } from "@/components/email-badges";
import { PageHeader } from "@/components/page-header";
import { requireOrgMember } from "@/lib/session";
import { RiskSettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Risk settings" };

export default async function RiskSettingsPage({
  params,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/risk/settings">) {
  const { orgSlug, projectSlug, envSlug } = await params;
  const { organization, can } = await requireOrgMember(orgSlug);
  if (!can({ risk: ["read"] })) notFound();
  const found = await getEnvironment({ organizationId: organization.id, projectSlug, envSlug });
  if (!found) notFound();
  const { project, environment } = found;
  const settings = await getRiskSettings({
    organizationId: organization.id,
    environmentId: environment.id,
  });
  const riskPath = `/${organization.slug}/projects/${project.slug}/${environment.slug}/risk`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link className="text-muted-foreground text-sm hover:text-foreground" href={riskPath}>
          ← Risk
        </Link>
        <PageHeader
          description="How this environment's assessments decide: score thresholds, captcha verification, and reasons you don't want."
          title={
            <span className="flex items-center gap-2">
              Risk settings <ModeBadge mode={environment.mode} />
            </span>
          }
        />
      </div>
      <Card>
        <CardPanel>
          <RiskSettingsForm
            canUpdate={can({ risk: ["update"] })}
            envSlug={environment.slug}
            orgSlug={organization.slug}
            projectSlug={project.slug}
            reasons={DISABLEABLE_REASON_CODES.map((code) => ({
              code,
              description: REASONS[code].description,
            }))}
            settings={settings}
          />
        </CardPanel>
      </Card>
    </div>
  );
}
