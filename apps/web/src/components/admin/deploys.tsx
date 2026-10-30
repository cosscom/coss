import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import { StatusDot, type StatusTone } from "@/components/status-dot";
import { DEPLOY_PHASES, DEPLOY_REPOSITORY } from "@/lib/deploy-runs";
import type { CiState, DeployRun, MainCommit } from "@/lib/deploys";
import { formatDateTime, formatRelative } from "@/lib/format";

/** The parts the admin console's deploys pages (`/admin/deploys`, `/admin/deploys/[runId]`) share. */

export const GITHUB = `https://github.com/${DEPLOY_REPOSITORY}`;

const CI: Record<CiState, { label: string; tone: StatusTone }> = {
  success: { label: "Passed", tone: "success" },
  failure: { label: "Failed", tone: "error" },
  running: { label: "Running", tone: "info" },
  canceled: { label: "Superseded", tone: "neutral" },
  none: { label: "—", tone: "neutral" },
};

export const TRIGGER: Record<DeployRun["trigger"], string> = {
  push: "Push",
  manual: "Deploy now",
  image_tag: "Redeploy",
};

export function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

export function CommitLink(props: { sha: string }) {
  return (
    <a
      className="font-mono text-xs hover:underline"
      href={`${GITHUB}/commit/${props.sha}`}
      rel="noreferrer"
      target="_blank"
    >
      {shortSha(props.sha)}
    </a>
  );
}

/** A run's phase, with the step it is on while active and when a waiting batch ships. */
export function DeployRunStatus(props: { run: DeployRun; now: Date }) {
  const { run, now } = props;
  const phase = DEPLOY_PHASES[run.phase];
  return (
    <StatusDot pulse={phase.active} tone={phase.tone}>
      {phase.label}
      {run.step ? <span className="text-muted-foreground"> · {run.step}</span> : null}
      {run.shipsAt ? (
        <span className="text-muted-foreground" title={formatDateTime(run.shipsAt)}>
          {" "}
          · ships{" "}
          {new Date(run.shipsAt) > now ? formatRelative(run.shipsAt, now) : "within a minute"}
        </span>
      ) : null}
    </StatusDot>
  );
}

/** Main's commits (merged pull requests), newest first, with their CI. */
export function CommitsTable(props: { commits: MainCommit[]; now: Date }) {
  return (
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
        {props.commits.map((commit) => (
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
              {commit.committedAt ? formatRelative(commit.committedAt, props.now) : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
