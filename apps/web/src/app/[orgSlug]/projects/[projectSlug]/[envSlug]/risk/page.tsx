import { listRiskAssessments } from "@coss/risk";
import { ListRiskAssessmentsQuery } from "@coss/risk/schemas";
import { getEnvironment } from "@coss/tenancy";
import { Button } from "@coss/ui/components/button";
import { Card, CardPanel } from "@coss/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModeBadge } from "@/components/email-badges";
import { PageHeader } from "@/components/page-header";
import { RiskDecisionBadge, RiskOutcomeBadge } from "@/components/risk-badges";
import { formatDateTime } from "@/lib/format";
import { requireOrgMember } from "@/lib/session";

export const metadata: Metadata = { title: "Risk" };

const PAGE_SIZE = 50;

/** The views above the table: each is a query string of `GET /v1/risk/assessments`. */
const VIEWS = [
  { id: "all", label: "All", query: {} },
  { id: "review", label: "Review queue", query: { review_status: "open" } },
  { id: "block", label: "Blocked", query: { decision: "block" } },
  { id: "allow", label: "Allowed", query: { decision: "allow" } },
] as const;

function single(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}

export default async function RiskPage({
  params,
  searchParams,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/risk">) {
  const { orgSlug, projectSlug, envSlug } = await params;
  const search = await searchParams;
  const { organization, can } = await requireOrgMember(orgSlug);
  if (!can({ risk: ["read"] })) notFound();
  const found = await getEnvironment({ organizationId: organization.id, projectSlug, envSlug });
  if (!found) notFound();
  const { project, environment } = found;

  const view = VIEWS.find((candidate) => candidate.id === single(search.view)) ?? VIEWS[0];
  const after = single(search.after);
  const query = ListRiskAssessmentsQuery.safeParse({ ...view.query, after, limit: PAGE_SIZE });
  const page = query.success
    ? await listRiskAssessments(
        { organizationId: organization.id, environmentId: environment.id },
        query.data,
      )
    : null;

  const base = `/${organization.slug}/projects/${project.slug}/${environment.slug}`;
  const riskPath = `${base}/risk`;
  const viewPath = (id: string) => (id === "all" ? riskPath : `${riskPath}?view=${id}`);
  const last = page?.data.at(-1);
  const nextPage =
    page?.has_more && last
      ? `${riskPath}?${new URLSearchParams({ ...(view.id === "all" ? {} : { view: view.id }), after: last.id })}`
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link className="text-muted-foreground text-sm hover:text-foreground" href={base}>
          ← {project.name} · {environment.name}
        </Link>
        <PageHeader
          actions={
            can({ riskList: ["read"] }) ? (
              <Button render={<Link href={`${riskPath}/lists`} />} size="sm" variant="outline">
                Allow &amp; block lists
              </Button>
            ) : null
          }
          description="Every assessment of sign-ups, logins and other events made with this environment's API keys: the decision, its score and the reasons behind it. Reviews stay open until you report an outcome."
          title={
            <span className="flex items-center gap-2">
              Risk <ModeBadge mode={environment.mode} />
            </span>
          }
        />
      </div>

      <nav className="flex flex-wrap gap-2">
        {VIEWS.map((candidate) => (
          <Button
            key={candidate.id}
            render={<Link href={viewPath(candidate.id)} />}
            size="sm"
            variant={candidate.id === view.id ? "secondary" : "ghost"}
          >
            {candidate.label}
          </Button>
        ))}
      </nav>

      <Card>
        <CardPanel className="p-2">
          {!page || page.data.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">
              {after
                ? "No more assessments."
                : view.id === "review"
                  ? "Nothing to review."
                  : "No assessments yet. Call coss.risk.assess() from your sign-up or login flow."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Reasons</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.data.map((assessment) => (
                  <TableRow key={assessment.id}>
                    <TableCell>
                      <Link className="hover:underline" href={`${riskPath}/${assessment.id}`}>
                        {formatDateTime(assessment.created_at)}
                      </Link>
                    </TableCell>
                    <TableCell>{assessment.event_name ?? assessment.event}</TableCell>
                    <TableCell className="max-w-64 truncate">
                      {assessment.user.email ?? assessment.user.id ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <RiskDecisionBadge decision={assessment.decision} />
                        {assessment.outcome ? (
                          <RiskOutcomeBadge outcome={assessment.outcome} />
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">{assessment.score.toFixed(2)}</TableCell>
                    <TableCell className="max-w-80 truncate text-muted-foreground text-xs">
                      {assessment.reasons.map((reason) => reason.code).join(", ") || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardPanel>
      </Card>

      {after || nextPage ? (
        <div className="flex gap-2">
          {after ? (
            <Button render={<Link href={viewPath(view.id)} />} size="sm" variant="outline">
              First page
            </Button>
          ) : null}
          {nextPage ? (
            <Button render={<Link href={nextPage} />} size="sm" variant="outline">
              Next page
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
