import { getRiskAssessment } from "@coss/risk";
import { getEnvironment } from "@coss/tenancy";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { RiskDecisionBadge, RiskOutcomeBadge } from "@/components/risk-badges";
import { formatDateTime } from "@/lib/format";
import { requireOrgMember } from "@/lib/session";
import { RiskFeedbackForm } from "./feedback-form";

export const metadata: Metadata = { title: "Risk assessment" };

function Detail(props: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-muted-foreground text-xs">{props.label}</dt>
      <dd className="text-sm">{props.children}</dd>
    </div>
  );
}

function yesNo(value: boolean | null | undefined): string {
  return value ? "Yes" : "No";
}

// After 90 days, or when the user was forgotten.
const REMOVED = <span className="text-muted-foreground">Removed</span>;
const NONE = <span className="text-muted-foreground">—</span>;

export default async function RiskAssessmentPage({
  params,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/risk/[assessmentId]">) {
  const { orgSlug, projectSlug, envSlug, assessmentId } = await params;
  const { organization, can } = await requireOrgMember(orgSlug);
  if (!can({ risk: ["read"] })) notFound();
  const found = await getEnvironment({ organizationId: organization.id, projectSlug, envSlug });
  if (!found) notFound();
  const { project, environment } = found;
  const assessment = await getRiskAssessment(
    { organizationId: organization.id, environmentId: environment.id },
    assessmentId,
  );
  if (!assessment) notFound();

  const riskPath = `/${organization.slug}/projects/${project.slug}/${environment.slug}/risk`;
  // Signals stay after the address itself is removed (90 days); without signals there was none.
  const { email, ip, velocity, captcha, login } = assessment.signals;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link className="text-muted-foreground text-sm hover:text-foreground" href={riskPath}>
          ← Risk
        </Link>
        <PageHeader
          description={`${assessment.id} · ${formatDateTime(assessment.created_at)}`}
          title={
            <span className="flex items-center gap-2">
              {assessment.event_name ?? assessment.event}
              <RiskDecisionBadge decision={assessment.decision} />
              {assessment.outcome ? <RiskOutcomeBadge outcome={assessment.outcome} /> : null}
            </span>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Decision</CardTitle>
          <CardDescription>
            Score {assessment.score.toFixed(2)}
            {assessment.review_status === "open" ? " · waiting for review" : ""}
            {assessment.degraded.length > 0
              ? ` · made without: ${assessment.degraded.join(", ")}`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardPanel>
          {assessment.reasons.length === 0 ? (
            <p className="text-muted-foreground text-sm">No risk signals fired.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {assessment.reasons.map((reason) => (
                <li className="flex flex-col" key={`${reason.code}-${reason.entry ?? ""}`}>
                  <code className="text-xs">{reason.code}</code>
                  <span className="text-sm">{reason.message}</span>
                </li>
              ))}
            </ul>
          )}
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Signals</CardTitle>
        </CardHeader>
        <CardPanel>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Detail label="User id">{assessment.user.id ?? NONE}</Detail>
            <Detail label="Email">{assessment.user.email ?? (email ? REMOVED : NONE)}</Detail>
            <Detail label="IP address">{assessment.ip ?? (ip ? REMOVED : NONE)}</Detail>
            {email ? (
              <>
                <Detail label="Email checks">
                  {email.valid ? `${email.deliverability}` : "invalid"}
                  {email.disposable ? " · disposable" : ""}
                  {email.role_account ? " · role account" : ""}
                  {email.free_provider ? " · free provider" : ""}
                </Detail>
                <Detail label="Did you mean">{email.suggestion ?? NONE}</Detail>
                <Detail label="Domain age">
                  {email.domain_age_days === null ? NONE : `${email.domain_age_days} days`}
                </Detail>
              </>
            ) : null}
            {ip ? (
              <>
                <Detail label="Network">{ip.asn ? `AS${ip.asn} ${ip.as_name ?? ""}` : NONE}</Detail>
                <Detail label="Country">{ip.country ?? NONE}</Detail>
                <Detail label="IP checks">
                  {ip.private
                    ? "private address"
                    : `Tor ${yesNo(ip.tor).toLowerCase()} · ${ip.hosting ? `${ip.hosting_kind}: ${ip.hosting_provider}` : "not hosting"}`}
                </Detail>
              </>
            ) : null}
            {captcha ? (
              <Detail label="Captcha">
                {!captcha.provided
                  ? "no token"
                  : captcha.passed === null
                    ? "not checked"
                    : captcha.passed
                      ? "passed"
                      : "failed"}
              </Detail>
            ) : null}
            {login ? (
              <Detail label="Login">
                {login.new_country || login.new_network
                  ? [
                      login.new_country ? "new country" : null,
                      login.new_network ? "new network" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : "usual country and network"}
              </Detail>
            ) : null}
            {velocity && Object.keys(velocity).length > 0 ? (
              <Detail label="Velocity">
                {Object.entries(velocity)
                  .map(([key, value]) => `${key} ${value}`)
                  .join(" · ")}
              </Detail>
            ) : null}
          </dl>
          {ip?.asn ? (
            // IPinfo Lite is CC BY-SA 4.0: credit it wherever its data is shown.
            <p className="mt-4 text-muted-foreground text-xs">
              Network and country data by{" "}
              <a className="underline" href="https://ipinfo.io" rel="noreferrer" target="_blank">
                IPinfo
              </a>
              .
            </p>
          ) : null}
        </CardPanel>
      </Card>

      {can({ risk: ["feedback"] }) ? (
        <Card>
          <CardHeader>
            <CardTitle>Outcome</CardTitle>
            <CardDescription>
              {assessment.outcome
                ? `Reported as ${assessment.outcome}. Report again to change it.`
                : "What did this turn out to be?"}
            </CardDescription>
          </CardHeader>
          <CardPanel>
            <RiskFeedbackForm
              assessmentId={assessment.id}
              envSlug={environment.slug}
              orgSlug={organization.slug}
              projectSlug={project.slug}
            />
          </CardPanel>
        </Card>
      ) : null}
    </div>
  );
}
