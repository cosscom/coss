import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import { GitCommitHorizontalIcon, RocketIcon, TriangleAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import { AdminActionDialog } from "@/components/admin/admin-action-dialog";
import { AutoRefresh } from "@/components/auto-refresh";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelBody } from "@/components/panel";
import { StatusDot, type StatusTone } from "@/components/status-dot";
import {
  DEPLOY_MAX_INTERVAL_MINUTES,
  DEPLOY_PHASES,
  DEPLOY_QUIET_MINUTES,
  DEPLOY_REPOSITORY,
} from "@/lib/deploy-runs";
import {
  type CiState,
  type DeployOverview,
  type DeployRun,
  deploysConfigured,
  GitHubError,
  getDeployOverview,
  redeployableCommits,
} from "@/lib/deploys";
import { formatDateTime, formatRelative } from "@/lib/format";
import { requirePlatformAdmin } from "@/lib/session";
import { deployNowAction, redeployAction } from "./actions";

export const metadata: Metadata = { title: "Deploys" };

const GITHUB = `https://github.com/${DEPLOY_REPOSITORY}`;

const CI: Record<CiState, { label: string; tone: StatusTone }> = {
  success: { label: "Passed", tone: "success" },
  failure: { label: "Failed", tone: "error" },
  running: { label: "Running", tone: "info" },
  canceled: { label: "Superseded", tone: "neutral" },
  none: { label: "—", tone: "neutral" },
};

const TRIGGER: Record<DeployRun["trigger"], string> = {
  push: "Push",
  manual: "Deploy now",
  image_tag: "Redeploy",
};

/**
 * Production deploys: the commit production runs, main's commits it doesn't run yet and the
 * Deploy workflow's runs, with "Deploy now" (skip the batch wait) and redeploying an earlier
 * commit. Everything comes from GitHub through the COSS Deploy app (`@/lib/deploys`).
 */
export default async function AdminDeploysPage() {
  await requirePlatformAdmin();
  const description = `Pushes to main ship in batches: ${DEPLOY_QUIET_MINUTES} minutes after the last push, or ${DEPLOY_MAX_INTERVAL_MINUTES} minutes after the previous deploy while pushes keep coming.`;

  if (!deploysConfigured()) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader description={description} title="Deploys" />
        <Panel>
          <PanelBody flush>
            <EmptyState
              compact
              description="Set DEPLOY_GITHUB_APP_ID and DEPLOY_GITHUB_APP_PRIVATE_KEY for the COSS Deploy GitHub App (README, “Deploying from the admin console”)."
              icon={RocketIcon}
              title="Deploys aren't set up"
            />
          </PanelBody>
        </Panel>
      </div>
    );
  }

  let overview: DeployOverview;
  try {
    overview = await getDeployOverview();
  } catch (error) {
    if (!(error instanceof GitHubError)) throw error;
    return (
      <div className="flex flex-col gap-6">
        <PageHeader description={description} title="Deploys" />
        <Panel>
          <PanelBody flush>
            <EmptyState
              compact
              description={error.message}
              icon={TriangleAlertIcon}
              title="Couldn't read GitHub"
            />
          </PanelBody>
        </Panel>
      </div>
    );
  }

  const now = new Date();
  const active = overview.runs.some((run) => DEPLOY_PHASES[run.phase].active);
  const redeployable = redeployableCommits(overview);
  const waiting = overview.pending.length;
  const waitingLabel = `${waiting}${overview.pendingTruncated ? "+" : ""} ${waiting === 1 ? "change" : "changes"}`;

  return (
    <div className="flex flex-col gap-6">
      {/* While a run is moving, follow it without reloading. */}
      {active ? <AutoRefresh seconds={30} /> : null}
      <PageHeader
        actions={
          <AdminActionDialog
            action={deployNowAction}
            description={
              waiting > 0
                ? `Builds main (${short(overview.main)}, ${waitingLabel} production doesn't run yet) and rolls it out now, in about ten minutes. Push runs still waiting for their batch are canceled.`
                : `Production already runs main (${short(overview.main)}). This builds and rolls it out again, e.g. to pick up an environment change.`
            }
            fields={{}}
            reason="optional"
            submitLabel="Deploy now"
            success={{
              title: "Deploy started",
              description: "It appears under Runs in a few seconds.",
            }}
            title="Deploy main now?"
            triggerLabel="Deploy now"
          />
        }
        description={description}
        meta={
          overview.live ? (
            <>
              Production runs <CommitLink sha={overview.live} />
              {overview.live === overview.main
                ? " · up to date with main"
                : ` · ${waitingLabel} waiting`}
            </>
          ) : (
            "Production's commit is unknown (no recent deploy)."
          )
        }
        title="Deploys"
      />

      <Panel description="Main's merges production doesn't run yet, newest first." title="Waiting">
        {waiting === 0 ? (
          <PanelBody flush>
            <EmptyState
              compact
              description="Everything on main is in production."
              icon={GitCommitHorizontalIcon}
              title="Nothing waiting"
            />
          </PanelBody>
        ) : (
          <Table variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>Commit</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>CI</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.pending.map((commit) => (
                <TableRow key={commit.sha}>
                  <TableCell>
                    <CommitLink sha={commit.sha} />
                  </TableCell>
                  <TableCell className="max-w-96 truncate">
                    {commit.title}
                    {commit.pullRequest ? (
                      <a
                        className="ml-1.5 text-muted-foreground hover:underline"
                        href={`${GITHUB}/pull/${commit.pullRequest}`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        #{commit.pullRequest}
                      </a>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{commit.author.name}</TableCell>
                  <TableCell>
                    <StatusDot pulse={commit.ci === "running"} tone={CI[commit.ci].tone}>
                      {CI[commit.ci].label}
                    </StatusDot>
                  </TableCell>
                  <TableCell
                    className="whitespace-nowrap text-muted-foreground"
                    title={formatDateTime(commit.committedAt)}
                  >
                    {commit.committedAt ? formatRelative(commit.committedAt, now) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      <Panel description="The Deploy workflow's latest runs on GitHub." title="Runs">
        {overview.runs.length === 0 ? (
          <PanelBody flush>
            <EmptyState compact icon={RocketIcon} title="No runs yet" />
          </PanelBody>
        ) : (
          <Table variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.runs.map((run) => {
                const phase = DEPLOY_PHASES[run.phase];
                return (
                  <TableRow key={run.id}>
                    <TableCell
                      className="whitespace-nowrap text-muted-foreground"
                      title={formatDateTime(run.createdAt)}
                    >
                      {formatRelative(run.createdAt, now)}
                    </TableCell>
                    <TableCell className="max-w-96">
                      <div className="truncate">
                        <a
                          className="hover:underline"
                          href={run.url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {run.title}
                        </a>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {TRIGGER[run.trigger]}
                        {run.actor ? ` by ${run.actor}` : ""} ·{" "}
                        {run.commit ? <CommitLink sha={run.commit} /> : "an earlier commit"}
                        {run.commit === overview.live ? " · running now" : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusDot pulse={phase.active} tone={phase.tone}>
                        {phase.label}
                        {run.shipsAt ? (
                          <span
                            className="text-muted-foreground"
                            title={formatDateTime(run.shipsAt)}
                          >
                            {" "}
                            · ships{" "}
                            {new Date(run.shipsAt) > now
                              ? formatRelative(run.shipsAt, now)
                              : "once CI passes"}
                          </span>
                        ) : null}
                      </StatusDot>
                    </TableCell>
                    <TableCell className="text-right">
                      {run.commit && redeployable.has(run.commit) ? (
                        <AdminActionDialog
                          action={redeployAction}
                          description={`Production goes back to ${short(run.commit)}'s images (already built) until main is deployed again: the next push or Deploy now. Push runs waiting for their batch are canceled. Database migrations aren't undone, so the older code must work with today's schema.`}
                          destructive
                          fields={{ commit: run.commit }}
                          reason="required"
                          reasonPlaceholder="e.g. Sign-in broken since the last deploy"
                          submitLabel="Redeploy"
                          success={{
                            title: "Redeploy started",
                            description: "It appears under Runs in a few seconds.",
                          }}
                          title={`Redeploy ${short(run.commit)}?`}
                          triggerLabel="Redeploy"
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}

function short(sha: string): string {
  return sha.slice(0, 7);
}

function CommitLink(props: { sha: string }) {
  return (
    <a
      className="font-mono text-xs hover:underline"
      href={`${GITHUB}/commit/${props.sha}`}
      rel="noreferrer"
      target="_blank"
    >
      {short(props.sha)}
    </a>
  );
}
