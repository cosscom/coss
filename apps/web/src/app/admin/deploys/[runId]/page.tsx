import { Button } from "@coss/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import { cn } from "@coss/ui/lib/utils";
import { ExternalLinkIcon, GitCommitHorizontalIcon, TriangleAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CommitLink,
  CommitsTable,
  DeployRunStatus,
  shortSha,
  TRIGGER,
} from "@/components/admin/deploys";
import { AutoRefresh } from "@/components/auto-refresh";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelBody } from "@/components/panel";
import { Stat, StatRow } from "@/components/stat-row";
import { STATUS_TONE_BACKGROUND, StatusDot } from "@/components/status-dot";
import {
  DEPLOY_PHASES,
  DEPLOY_REFRESH_SECONDS,
  type DeployPhase,
  ROLLED_OUT_PHASES,
  STEP_STATES,
} from "@/lib/deploy-runs";
import {
  type DeployChanges,
  type DeployJob,
  type DeployOverview,
  type DeployRunDetail,
  deploysConfigured,
  GitHubError,
  getDeployOverview,
  getDeployRun,
  redeployableCommits,
} from "@/lib/deploys";
import { formatDateTime, formatElapsed, formatRelative } from "@/lib/format";
import { requirePlatformAdmin } from "@/lib/session";
import { RedeployDialog } from "../redeploy-dialog";

export const metadata: Metadata = { title: "Deploy" };

/** GitHub's own bookkeeping steps, left out of the step lists. */
function isOwnStep(name: string): boolean {
  return name !== "Set up job" && name !== "Complete job" && !name.startsWith("Post ");
}

/**
 * One Deploy run: what it ships against the deploy before it, its jobs on a timeline, the deploy
 * job's steps and the end of each failed job's log. Re-reads GitHub on its own while the run moves.
 */
export default async function AdminDeployRunPage({ params }: PageProps<"/admin/deploys/[runId]">) {
  await requirePlatformAdmin();
  const { runId } = await params;
  if (!/^\d{1,16}$/.test(runId) || !deploysConfigured()) notFound();

  // The overview only says whether the run's commit is live and can be redeployed: without it
  // the run is still shown.
  const overviewRead = getDeployOverview().catch((error: unknown) => {
    if (!(error instanceof GitHubError)) throw error;
    return null;
  });
  let detail: DeployRunDetail | null;
  let overview: DeployOverview | null;
  try {
    [detail, overview] = await Promise.all([getDeployRun(Number(runId)), overviewRead]);
  } catch (error) {
    if (!(error instanceof GitHubError)) throw error;
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          actions={
            <AutoRefresh
              renderedAt={new Date().toISOString()}
              seconds={DEPLOY_REFRESH_SECONDS.error}
            />
          }
          title="Deploy"
        />
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
  if (!detail) notFound();

  const now = new Date();
  const { run } = detail;
  const active = DEPLOY_PHASES[run.phase].active;
  const redeployable =
    run.commit !== null && overview !== null && redeployableCommits(overview).has(run.commit);
  const deployJob = detail.jobs.find((job) => job.name === "deploy" && job.state !== "skipped");
  const failed = detail.jobs.filter((job) => job.state === "failure");
  const builds = detail.jobs.filter(
    (job) => job.name.startsWith("build") && job.state !== "skipped",
  );
  // The builds run side by side: the slowest is how long building took.
  const buildMs = builds.some((job) => job.durationMs !== null)
    ? Math.max(...builds.map((job) => job.durationMs ?? 0))
    : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        actions={
          <>
            <AutoRefresh
              renderedAt={now.toISOString()}
              seconds={active ? DEPLOY_REFRESH_SECONDS.active : DEPLOY_REFRESH_SECONDS.idle}
            />
            <Button
              render={<a href={run.url} rel="noreferrer" target="_blank" />}
              size="sm"
              variant="outline"
            >
              GitHub
              <ExternalLinkIcon />
            </Button>
            {redeployable && run.commit ? <RedeployDialog commit={run.commit} /> : null}
          </>
        }
        meta={
          <>
            <DeployRunStatus now={now} run={run} />
            <span>
              {TRIGGER[run.trigger]}
              {run.actor ? ` by ${run.actor}` : ""} ·{" "}
              {run.commit ? <CommitLink sha={run.commit} /> : "an earlier commit"}
              {run.commit !== null && run.commit === overview?.live
                ? " · running in production now"
                : ""}
              {detail.attempt > 1 ? ` · attempt ${detail.attempt}` : ""}
            </span>
          </>
        }
        title={run.title}
      />

      <StatRow>
        <Stat
          detail={formatDateTime(detail.startedAt)}
          label="Started"
          value={formatRelative(detail.startedAt, now)}
        />
        <Stat
          detail={
            active
              ? "so far"
              : detail.finishedAt
                ? `ended ${formatDateTime(detail.finishedAt)}`
                : undefined
          }
          label="Duration"
          value={run.durationMs === null ? "—" : formatElapsed(run.durationMs)}
        />
        <Stat
          detail={"base" in detail.changes ? `since ${shortSha(detail.changes.base)}` : undefined}
          label={detail.changes.kind === "rolls_back" ? "Changes rolled back" : "Changes"}
          value={changeCount(detail.changes)}
        />
        <Stat
          detail={
            run.trigger === "image_tag"
              ? "images built before"
              : buildMs === null
                ? undefined
                : `built in ${formatElapsed(buildMs)}`
          }
          label="Rollout"
          value={deployJob?.durationMs == null ? "—" : formatElapsed(deployJob.durationMs)}
        />
      </StatRow>

      {failed.map((job) => (
        <FailedJob job={job} key={job.id ?? job.name} />
      ))}

      <Panel
        description="Each job of the run, laid out over its time: the batch wait, the image builds and the rollout."
        title="Jobs"
      >
        <JobsTable detail={detail} now={now} />
      </Panel>

      {deployJob ? (
        <Panel
          description="The deploy job: migrations, then all services roll out at once, then the CDN and routing."
          title="Rollout"
        >
          <StepsTable job={deployJob} />
        </Panel>
      ) : null}

      <Panel description={changesDescription(detail.changes, run.phase)} title="Changes">
        {detail.changes.kind === "ships" || detail.changes.kind === "rolls_back" ? (
          detail.changes.commits.length > 0 ? (
            <CommitsTable commits={detail.changes.commits} now={now} />
          ) : (
            <PanelBody flush>
              <EmptyState compact icon={GitCommitHorizontalIcon} title="No merges to list" />
            </PanelBody>
          )
        ) : detail.changes.kind === "unreadable" ? (
          <PanelBody flush>
            <EmptyState
              compact
              description={detail.changes.message}
              icon={TriangleAlertIcon}
              title="Couldn't read the changes from GitHub"
            />
          </PanelBody>
        ) : (
          <PanelBody flush>
            <EmptyState
              compact
              description={
                detail.changes.kind === "same"
                  ? "The same commit as the deploy before it, e.g. to pick up an environment change."
                  : "There is no earlier deploy among the runs read to compare with."
              }
              icon={GitCommitHorizontalIcon}
              title={detail.changes.kind === "same" ? "No code changes" : "Changes unknown"}
            />
          </PanelBody>
        )}
      </Panel>
    </div>
  );
}

function changeCount(changes: DeployChanges): string {
  if (changes.kind === "unknown" || changes.kind === "unreadable") return "—";
  if (changes.kind === "same") return "0";
  return `${changes.commits.length}${changes.truncated ? "+" : ""}`;
}

function changesDescription(changes: DeployChanges, phase: DeployPhase): string {
  if (changes.kind === "unknown" || changes.kind === "unreadable" || changes.kind === "same") {
    return "What this run changes in production, against the deploy before it.";
  }
  const base = shortSha(changes.base);
  const truncated = changes.truncated ? " (the latest 100 shown)" : "";
  if (changes.kind === "rolls_back") {
    const verb = ROLLED_OUT_PHASES.includes(phase)
      ? "took"
      : DEPLOY_PHASES[phase].active
        ? "takes"
        : "would have taken";
    return `Main's merges this redeploy ${verb} back out of production, which ran ${base} before it${truncated}.`;
  }
  const verb = ROLLED_OUT_PHASES.includes(phase)
    ? "shipped"
    : phase === "skipped"
      ? "a later run shipped"
      : DEPLOY_PHASES[phase].active
        ? "ships"
        : "would have shipped";
  return `Main's merges since the deploy before it (${base}): what this run ${verb}${truncated}.`;
}

/** The jobs, each with a bar placing it in the run's time span. */
function JobsTable(props: { detail: DeployRunDetail; now: Date }) {
  const { detail, now } = props;
  const start = Date.parse(detail.startedAt);
  const end = detail.finishedAt ? Date.parse(detail.finishedAt) : now.getTime();
  const span = Math.max(1, end - start);
  return (
    <Table variant="card">
      <TableHeader>
        <TableRow>
          <TableHead>Job</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden w-[40%] md:table-cell">Timeline</TableHead>
          <TableHead className="text-right">Duration</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {detail.jobs.map((job) => {
          const state = STEP_STATES[job.state];
          const running = job.steps.find((step) => step.state === "running");
          const jobStart = job.startedAt ? Date.parse(job.startedAt) : null;
          const left = jobStart === null ? 0 : ((jobStart - start) / span) * 100;
          const width = job.durationMs === null ? 0 : (job.durationMs / span) * 100;
          return (
            <TableRow key={job.id ?? job.name}>
              <TableCell>
                {job.url ? (
                  <a className="hover:underline" href={job.url} rel="noreferrer" target="_blank">
                    {job.name}
                  </a>
                ) : (
                  job.name
                )}
              </TableCell>
              <TableCell>
                <StatusDot pulse={state.active} tone={state.tone}>
                  {state.label}
                  {running ? (
                    <span className="text-muted-foreground"> · {running.name}</span>
                  ) : null}
                </StatusDot>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="relative h-2 rounded-full bg-muted">
                  {jobStart !== null && job.durationMs !== null ? (
                    <div
                      className={cn(
                        "absolute inset-y-0 min-w-1 rounded-full",
                        STATUS_TONE_BACKGROUND[state.tone],
                        state.active && "motion-safe:animate-pulse",
                      )}
                      style={{
                        left: `${Math.min(100, Math.max(0, left))}%`,
                        width: `${Math.min(100 - Math.max(0, left), width)}%`,
                      }}
                      title={`${formatDateTime(job.startedAt)} · ${formatElapsed(job.durationMs)}`}
                    />
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap text-right text-muted-foreground tabular-nums">
                {job.durationMs === null ? "—" : formatElapsed(job.durationMs)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function StepsTable(props: { job: DeployJob }) {
  return (
    <Table variant="card">
      <TableHeader>
        <TableRow>
          <TableHead>Step</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Duration</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.job.steps
          .filter((step) => isOwnStep(step.name))
          .map((step) => {
            const state = STEP_STATES[step.state];
            return (
              <TableRow key={step.number}>
                <TableCell>{step.name}</TableCell>
                <TableCell>
                  <StatusDot pulse={state.active} tone={state.tone}>
                    {state.label}
                  </StatusDot>
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-muted-foreground tabular-nums">
                  {step.durationMs === null || step.state === "skipped"
                    ? "—"
                    : formatElapsed(step.durationMs)}
                </TableCell>
              </TableRow>
            );
          })}
      </TableBody>
    </Table>
  );
}

/** A failed job: the step it failed at and the end of its log. */
function FailedJob(props: { job: DeployJob }) {
  const { job } = props;
  const step = job.steps.find((candidate) => candidate.state === "failure");
  return (
    <Panel
      action={
        job.url ? (
          <Button
            render={<a href={job.url} rel="noreferrer" target="_blank" />}
            size="sm"
            variant="outline"
          >
            Full log
            <ExternalLinkIcon />
          </Button>
        ) : null
      }
      description={step ? `Failed at “${step.name}”.` : undefined}
      title={`${job.name} failed`}
    >
      <PanelBody flush>
        {job.log && job.log.length > 0 ? (
          // Reversed so it opens scrolled to the end, where the error is.
          <div className="flex max-h-96 flex-col-reverse overflow-auto">
            <pre className="px-5 py-4 font-mono text-xs leading-relaxed">
              {job.log.map((line, index) => (
                <div
                  className={cn(line.error && "font-medium text-destructive-foreground")}
                  // biome-ignore lint/suspicious/noArrayIndexKey: log lines have no identity.
                  key={index}
                >
                  {line.text || " "}
                </div>
              ))}
            </pre>
          </div>
        ) : (
          <EmptyState
            compact
            description="GitHub's log for this job couldn't be read here. Open it on GitHub."
            icon={TriangleAlertIcon}
            title="No log excerpt"
          />
        )}
      </PanelBody>
    </Panel>
  );
}
