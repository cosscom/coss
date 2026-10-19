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

/**
 * How often the deploys pages re-read GitHub: often while a run moves, slower otherwise (and
 * after GitHub couldn't be read). Conditional requests make unchanged reads free (`deploys.ts`).
 */
export const DEPLOY_REFRESH_SECONDS = { active: 10, idle: 30, error: 60 };

export type GitHubStep = {
  name: string;
  number?: number;
  status: string;
  conclusion: string | null;
  started_at?: string | null;
  completed_at?: string | null;
};

export type GitHubJob = {
  id?: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  steps?: GitHubStep[];
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
  /** When the current attempt started, and when GitHub last changed the run (its end, once done). */
  run_started_at?: string;
  updated_at?: string;
  html_url: string;
  /** The workflow file (`.github/workflows/deploy.yml`). */
  path?: string;
  head_branch?: string | null;
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
  | "deployed_with_errors"
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
  deployed_with_errors: { label: "Deployed, a later step failed", tone: "warning", active: false },
  skipped: { label: "Shipped by a later run", tone: "neutral", active: false },
  failed: { label: "Failed", tone: "error", active: false },
  canceled: { label: "Canceled", tone: "neutral", active: false },
};

/** Runs whose rollout finished: production ran their commit (whatever came after). */
export const ROLLED_OUT_PHASES: DeployPhase[] = ["deployed", "deployed_with_errors"];

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
  // The steps after the rollout (the CDN invalidation, the routing check) can fail once production
  // already runs the commit.
  const rolledOut =
    deploy?.steps?.find((step) => step.name === ROLLOUT_STEP)?.conclusion === "success";
  if (rolledOut) return run.conclusion === "success" ? "deployed" : "deployed_with_errors";
  if (run.conclusion === "cancelled") return "canceled";
  if (run.conclusion !== "success") return "failed";
  return "skipped";
}

/**
 * When a run's rollout started and, if it succeeded, finished (its deploy job's `Roll out` step).
 * Production's commit changes at `finishedAt`: runs are ordered by it, not by when they were
 * created (an older run re-run later rolls out after newer ones).
 */
export function rolloutTimes(jobs: GitHubJob[]): {
  startedAt: Date | null;
  finishedAt: Date | null;
} {
  const step = jobs
    .find((job) => job.name === "deploy")
    ?.steps?.find((candidate) => candidate.name === ROLLOUT_STEP);
  const at = (value: string | null | undefined) => {
    const time = value ? Date.parse(value) : Number.NaN;
    return Number.isNaN(time) ? null : new Date(time);
  };
  return {
    startedAt: at(step?.started_at),
    finishedAt: step?.conclusion === "success" ? at(step.completed_at ?? step.started_at) : null,
  };
}

/** Of `entries`, the one whose rollout finished last before `before` (production's commit then). */
export function latestRolloutBefore<T extends { jobs: GitHubJob[] }>(
  entries: T[],
  before: Date,
): { entry: T; at: Date } | null {
  let best: { entry: T; at: Date } | null = null;
  for (const entry of entries) {
    const at = rolloutTimes(entry.jobs).finishedAt;
    if (at && at < before && (!best || at > best.at)) best = { entry, at };
  }
  return best;
}

/** A run's earlier attempts read when looking for a rollout (re-runs are rarely more). */
export const EARLIER_ATTEMPTS_READ = 3;

/**
 * The rollout production ran just before `reference` (when `run`'s own rollout started, or would
 * have): of `run`'s earlier attempts and `candidates` (other runs), the one that finished rolling
 * out last before it. `load` reads a run's jobs, of its latest attempt or an earlier `attempt`.
 *
 * Candidates go latest change first: a rollout finishes before its run's last change, so once the
 * best rollout found is later than a candidate's last change, nothing after it can beat it. A
 * candidate whose latest attempt didn't roll out before `reference` (it failed, or was re-run
 * after it) has its earlier attempts read too: re-running the jobs that failed after a rollout
 * (the CDN invalidation, the routing check) rolls the same commit out again.
 *
 * `readAhead`: how many of the first candidates to start loading at once, instead of one after
 * another as the search reaches them (each load is a request to GitHub; most searches end within
 * a few candidates, so the rest are read for nothing).
 */
export async function findPreviousRollout<T extends { run: GitHubRun; jobs: GitHubJob[] }>(
  run: GitHubRun,
  candidates: GitHubRun[],
  reference: Date,
  load: (run: GitHubRun, attempt?: number) => Promise<T>,
  readAhead = 0,
): Promise<{ best: { entry: T; at: Date } | null; read: T[] }> {
  const earlierAttempts = async (of: GitHubRun): Promise<T[]> => {
    const entries: T[] = [];
    const latest = of.run_attempt ?? 1;
    for (
      let attempt = latest - 1;
      attempt >= Math.max(1, latest - EARLIER_ATTEMPTS_READ);
      attempt--
    ) {
      entries.push(await load(of, attempt));
    }
    return entries;
  };
  const lastChange = (of: GitHubRun) => Date.parse(of.updated_at ?? of.created_at);

  const ordered = candidates
    .filter((candidate) => candidate.id !== run.id)
    .sort((a, b) => lastChange(b) - lastChange(a));
  const ahead = new Map(
    ordered.slice(0, readAhead).map((candidate) => [candidate.id, load(candidate)]),
  );
  // A failed load the search never reaches is no failure of the search.
  for (const loading of ahead.values()) loading.catch(() => {});

  const read = await earlierAttempts(run);
  for (const candidate of ordered) {
    const best = latestRolloutBefore(read, reference);
    if (best && lastChange(candidate) < best.at.getTime()) break;
    const latest = await (ahead.get(candidate.id) ?? load(candidate));
    read.push(latest);
    if (!latestRolloutBefore([latest], reference)) read.push(...(await earlierAttempts(candidate)));
  }
  return { best: latestRolloutBefore(read, reference), read };
}

/** The run name of a dispatch that deploys an earlier commit's images (deploy.yml's `run-name`). */
export function imageTagRunName(sha: string): string {
  return `Deploy ${sha}`;
}

/**
 * The commit a run ships: a dispatch's `image_tag` (in its run name), else the run's commit.
 * `null` for an `image_tag` dispatch that doesn't name it (made before the workflow's `run-name`;
 * it built nothing, so its own commit isn't what it shipped).
 */
export function deployedCommit(run: GitHubRun, jobs: GitHubJob[]): string | null {
  if (run.event !== "workflow_dispatch") return run.head_sha;
  const tag = /^Deploy ([0-9a-f]{40})$/.exec(run.display_title)?.[1];
  if (tag) return tag;
  const builds = jobs.filter((job) => job.name.startsWith("build"));
  if (builds.length > 0 && builds.every((job) => job.conclusion === "skipped")) return null;
  return run.head_sha;
}

/** Whether a run deploys an earlier commit's images (`image_tag`) rather than its own commit. */
export function isImageTagRun(run: GitHubRun, jobs: GitHubJob[]): boolean {
  return deployedCommit(run, jobs) !== run.head_sha;
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

/**
 * When a run's latest `production` job started (its `build`/`deploy` jobs that ran), if one did:
 * every such job records a GitHub deployment, and the gate counts from the latest one.
 */
export function latestProductionJobAt(jobs: GitHubJob[]): Date | null {
  const starts = jobs
    .filter((job) => job.name === "deploy" || job.name.startsWith("build"))
    .filter((job) => job.conclusion !== "skipped")
    .map((job) => (job.started_at ? Date.parse(job.started_at) : Number.NaN))
    .filter((time) => !Number.isNaN(time));
  return starts.length > 0 ? new Date(Math.max(...starts)) : null;
}

export type StepState = "queued" | "running" | "success" | "failure" | "canceled" | "skipped";

export const STEP_STATES: Record<StepState, { label: string; tone: StatusTone; active: boolean }> =
  {
    queued: { label: "Queued", tone: "neutral", active: true },
    running: { label: "Running", tone: "info", active: true },
    success: { label: "Succeeded", tone: "success", active: false },
    failure: { label: "Failed", tone: "error", active: false },
    canceled: { label: "Canceled", tone: "neutral", active: false },
    skipped: { label: "Skipped", tone: "neutral", active: false },
  };

/** A job's or step's state from GitHub's `status` and `conclusion`. */
export function stepState(item: { status: string; conclusion: string | null }): StepState {
  if (item.status === "in_progress") return "running";
  if (item.status !== "completed") return "queued";
  if (item.conclusion === "success" || item.conclusion === "neutral") return "success";
  if (item.conclusion === "skipped") return "skipped";
  if (item.conclusion === "cancelled") return "canceled";
  return "failure";
}

/**
 * What an active run is doing right now: the running step of its running job (the deploy job
 * first, it is the one that matters while builds overlap), e.g. `{ job: "deploy", step: "Migrate" }`.
 */
export function currentStep(jobs: GitHubJob[]): { job: string; step: string } | null {
  const running = jobs
    .filter((job) => job.status === "in_progress")
    .sort((a, b) => Number(b.name === "deploy") - Number(a.name === "deploy"));
  for (const job of running) {
    const step = job.steps?.find((candidate) => candidate.status === "in_progress");
    if (step) return { job: job.name, step: step.name };
  }
  return null;
}

/** Milliseconds from `start` to `end` (or `now`, still running); `null` if it never started. */
export function elapsedMs(
  start: string | null | undefined,
  end: string | null | undefined,
  now: Date,
): number | null {
  if (!start) return null;
  const from = Date.parse(start);
  const to = end ? Date.parse(end) : now.getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return Math.max(0, to - from);
}

export type LogLine = { text: string; error: boolean };

const LOG_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z ?/;
// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI colours start with ESC.
const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g;

/**
 * The part of a failed job's log worth showing: the failing step's output, from its "Run …" line
 * to the job's last `##[error]` line (what follows is GitHub's post-job cleanup), at most its
 * last `max` lines. Without an error line, the log's last lines. Each step's echoed script and
 * environment (inside GitHub's `##[group]`, whose title stays), timestamps and colours are
 * dropped. GitHub masks the workflow's secrets in logs itself.
 */
export function failureLogExcerpt(log: string, max = 60): LogLine[] {
  const lines: LogLine[] = [];
  /** Where each step's output starts (its "Run …" title). */
  const stepStarts: number[] = [];
  let grouped = false;
  for (const raw of log.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = raw.replace(LOG_TIMESTAMP, "").replace(ANSI, "");
    if (line.startsWith("##[group]")) {
      if (line.startsWith("##[group]Run ")) stepStarts.push(lines.length);
      lines.push({ text: line.slice(9), error: false });
      grouped = true;
    } else if (line.startsWith("##[endgroup]")) {
      grouped = false;
    } else if (line.startsWith("##[error]")) {
      lines.push({ text: line.slice(9), error: true });
    } else if (!grouped) {
      lines.push({ text: line, error: false });
    }
  }
  while (lines.length > 0 && lines.at(-1)?.text.trim() === "") lines.pop();
  const lastError = lines.findLastIndex((line) => line.error);
  if (lastError === -1) return lines.slice(-max);
  const end = lastError + 1;
  const stepStart = stepStarts.findLast((start) => start < end) ?? 0;
  return lines.slice(Math.max(stepStart, end - max), end);
}
