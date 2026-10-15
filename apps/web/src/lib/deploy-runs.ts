import type { StatusTone } from "@/components/status-dot";

/**
 * The Deploy workflow (.github/workflows/deploy.yml) as the admin console's deploys page reads it:
 * what each run is doing from its jobs, which commit it ships, and main's history since the
 * running commit. Pure; the GitHub calls are in `deploys.ts`.
 */

export const DEPLOY_REPOSITORY = "cosscom/coss";
export const DEPLOY_BRANCH = "main";

/** How long a push waits for a quieter main, and the longest gap between deploys (the `gate` job). */
export const DEPLOY_QUIET_MINUTES = 20;
export const DEPLOY_MAX_INTERVAL_MINUTES = 60;

export type GitHubJob = {
  name: string;
  status: string;
  conclusion: string | null;
  started_at?: string | null;
  steps?: { name: string; status: string; conclusion: string | null }[];
};

export type GitHubRun = {
  id: number;
  run_attempt?: number;
  status: string | null;
  conclusion: string | null;
  event: string;
  head_sha: string;
  display_title: string;
  created_at: string;
  html_url: string;
  triggering_actor?: { login: string } | null;
  head_commit?: { message: string } | null;
};

export type GitHubCommit = {
  sha: string;
  parents: { sha: string }[];
  html_url: string;
  author: { login: string; avatar_url: string } | null;
  commit: { message: string; author: { name: string; date: string } | null };
};

export type DeployPhase =
  | "queued"
  | "waiting"
  | "building"
  | "deploying"
  | "deployed"
  | "skipped"
  | "failed"
  | "canceled";

export const DEPLOY_PHASES: Record<
  DeployPhase,
  { label: string; tone: StatusTone; active: boolean }
> = {
  queued: { label: "Queued", tone: "neutral", active: true },
  waiting: { label: "Waiting for a quiet main", tone: "info", active: true },
  building: { label: "Building", tone: "info", active: true },
  deploying: { label: "Deploying", tone: "info", active: true },
  deployed: { label: "Deployed", tone: "success", active: false },
  skipped: { label: "Shipped by a later run", tone: "neutral", active: false },
  failed: { label: "Failed", tone: "error", active: false },
  canceled: { label: "Canceled", tone: "neutral", active: false },
};

/** Runs that haven't started building or deploying: "Deploy now" cancels them. */
export const CANCELABLE_PHASES: DeployPhase[] = ["queued", "waiting", "building"];

const ROLLOUT_STEP = "Roll out";

/** What a run is doing, from its jobs (`prepare`, `gate`, `build (…)`, `deploy`). */
export function deployRunPhase(run: GitHubRun, jobs: GitHubJob[]): DeployPhase {
  const deploy = jobs.find((job) => job.name === "deploy");
  const builds = jobs.filter((job) => job.name.startsWith("build"));
  const gate = jobs.find((job) => job.name === "gate");
  const running = (job: GitHubJob | undefined) => job !== undefined && job.status !== "completed";

  // A job waiting for its runner (or the deploy job for its turn) already counts as its phase.
  if (run.status !== "completed") {
    if (running(gate)) return gate?.status === "in_progress" ? "waiting" : "queued";
    if (builds.some(running)) return "building";
    if (deploy) return "deploying";
    return "queued";
  }
  if (run.conclusion === "cancelled") return "canceled";
  if (run.conclusion !== "success") return "failed";
  const rollout = deploy?.steps?.find((step) => step.name === ROLLOUT_STEP);
  return rollout?.conclusion === "success" ? "deployed" : "skipped";
}

/** The run name of a dispatch that deploys an earlier commit's images (deploy.yml's `run-name`). */
export function imageTagRunName(sha: string): string {
  return `Deploy ${sha}`;
}

/** The commit a run ships: a dispatch's `image_tag` (in its run name), else the run's commit. */
export function deployedCommit(run: GitHubRun): string {
  if (run.event === "workflow_dispatch") {
    const tag = /^Deploy ([0-9a-f]{40})$/.exec(run.display_title)?.[1];
    if (tag) return tag;
  }
  return run.head_sha;
}

/** Whether a run deploys an earlier commit's images (`image_tag`) rather than its own commit. */
export function isImageTagRun(run: GitHubRun): boolean {
  return deployedCommit(run) !== run.head_sha;
}

/**
 * A commit's headline: a pull request merge's title and number ("Merge pull request #106 from
 * cosscom/branch", a blank line, then the title), else the first line.
 */
export function commitSummary(message: string): { title: string; pullRequest: number | null } {
  const lines = message.split("\n");
  const merge = /^Merge pull request #(\d+) from /.exec(lines[0] ?? "");
  if (merge) {
    const title = lines.slice(1).find((line) => line.trim() !== "");
    return { title: title?.trim() ?? lines[0] ?? "", pullRequest: Number(merge[1]) };
  }
  return { title: lines[0]?.trim() ?? "", pullRequest: null };
}

/**
 * Main's own history from `head` back to (not including) `base`: first parents only, so a merged
 * pull request is one entry rather than its every commit. Stops early when `commits` (GitHub's
 * compare, at most 250) doesn't reach `base`.
 */
export function firstParentChain(
  commits: GitHubCommit[],
  head: string,
  base: string | null,
): GitHubCommit[] {
  const bySha = new Map(commits.map((commit) => [commit.sha, commit]));
  const chain: GitHubCommit[] = [];
  let current = bySha.get(head);
  while (current && current.sha !== base) {
    chain.push(current);
    const parent = current.parents[0]?.sha;
    current = parent ? bySha.get(parent) : undefined;
  }
  return chain;
}

/**
 * When the `gate` of a push run waiting for a quieter main lets it through, if nothing newer is
 * pushed: `DEPLOY_QUIET_MINUTES` after its push or `DEPLOY_MAX_INTERVAL_MINUTES` after
 * production's last deploy started, whichever comes first (and never before its CI passes). No
 * known last deploy (none among the runs read) means it was long ago: as soon as CI passes.
 */
export function batchShipsAt(pushedAt: Date, lastDeployAt: Date | null): Date {
  if (!lastDeployAt) return pushedAt;
  const quiet = pushedAt.getTime() + DEPLOY_QUIET_MINUTES * 60_000;
  const interval = lastDeployAt.getTime() + DEPLOY_MAX_INTERVAL_MINUTES * 60_000;
  return new Date(Math.min(quiet, interval));
}

/** When a run started building or deploying (its `build`/`deploy` jobs), if it did. */
export function shippingStartedAt(jobs: GitHubJob[]): Date | null {
  const starts = jobs
    .filter((job) => job.name === "deploy" || job.name.startsWith("build"))
    .map((job) => (job.started_at ? Date.parse(job.started_at) : Number.NaN))
    .filter((time) => !Number.isNaN(time));
  return starts.length > 0 ? new Date(Math.min(...starts)) : null;
}
