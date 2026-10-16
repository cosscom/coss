import "server-only";
import { env } from "@/env";
import {
  batchShipsAt,
  CANCELABLE_PHASES,
  commitSummary,
  DEPLOY_BRANCH,
  DEPLOY_REPOSITORY,
  type DeployPhase,
  deployedCommit,
  deployRunPhase,
  firstParentChain,
  type GitHubCommit,
  type GitHubJob,
  type GitHubRun,
  isImageTagRun,
  latestProductionJobAt,
  ROLLED_OUT_PHASES,
} from "./deploy-runs";
import { githubAppJwt, githubAppPrivateKey } from "./github-app";

/**
 * The admin console's deploys page: reads the Deploy workflow's runs and main's commits, and
 * dispatches the workflow, through the COSS Deploy GitHub App (DEPLOY_GITHUB_APP_ID and
 * DEPLOY_GITHUB_APP_PRIVATE_KEY; README, "Deploying from the admin console"). Its installation
 * token can read the repository and run its workflows, nothing else: the workflow itself refuses
 * anything but main, so the most this can do is ship main early or redeploy an earlier commit.
 */

const API = "https://api.github.com";
const REPO = `/repos/${DEPLOY_REPOSITORY}`;
const DEPLOY_WORKFLOW = "deploy.yml";
const CI_WORKFLOW = "ci.yml";
/** Runs shown, each with one jobs request. */
const RUNS_SHOWN = 12;

export function deploysConfigured(): boolean {
  return Boolean(env.DEPLOY_GITHUB_APP_ID && env.DEPLOY_GITHUB_APP_PRIVATE_KEY);
}

export class GitHubError extends Error {}

let installationId: number | undefined;
let installationToken: { value: string; expiresAt: number } | undefined;

async function call<T>(
  path: string,
  token: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      method: init.method ?? "GET",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "user-agent": "coss-dashboard",
        "x-github-api-version": "2022-11-28",
        ...(init.body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new GitHubError(`GitHub didn't answer (${(error as Error).message}).`);
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    const message = (detail as { message?: string } | null)?.message ?? response.statusText;
    throw new GitHubError(`GitHub answered ${response.status} to ${path}: ${message}`);
  }
  return (
    response.status === 204 || response.status === 202 ? undefined : await response.json()
  ) as T;
}

/** An installation token for the repository, cached until five minutes before it expires. */
async function token(): Promise<string> {
  if (installationToken && installationToken.expiresAt - 5 * 60_000 > Date.now()) {
    return installationToken.value;
  }
  if (!env.DEPLOY_GITHUB_APP_ID || !env.DEPLOY_GITHUB_APP_PRIVATE_KEY) {
    throw new GitHubError("Deploys aren't set up: DEPLOY_GITHUB_APP_ID and its private key.");
  }
  const jwt = githubAppJwt(
    env.DEPLOY_GITHUB_APP_ID,
    githubAppPrivateKey(env.DEPLOY_GITHUB_APP_PRIVATE_KEY),
  );
  installationId ??= (await call<{ id: number }>(`${REPO}/installation`, jwt)).id;
  // Only what this page uses, whatever else the app was granted.
  const created = await call<{ token: string; expires_at: string }>(
    `/app/installations/${installationId}/access_tokens`,
    jwt,
    {
      method: "POST",
      body: {
        repositories: [DEPLOY_REPOSITORY.split("/")[1]],
        permissions: { actions: "write", contents: "read" },
      },
    },
  );
  installationToken = { value: created.token, expiresAt: Date.parse(created.expires_at) };
  return created.token;
}

async function github<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  return call<T>(path, await token(), init);
}

export type CiState = "success" | "failure" | "running" | "canceled" | "none";

export type PendingCommit = {
  sha: string;
  url: string;
  title: string;
  pullRequest: number | null;
  author: { name: string; avatarUrl: string | null };
  committedAt: string | null;
  ci: CiState;
};

export type DeployRun = {
  id: number;
  url: string;
  phase: DeployPhase;
  /** The commit it ships (`null`: an old redeploy that doesn't say). */
  commit: string | null;
  title: string;
  trigger: "push" | "manual" | "image_tag";
  actor: string | null;
  createdAt: string;
  /** A push waiting for a quieter main: when its batch ships if nothing newer is pushed. */
  shipsAt: string | null;
};

export type DeployOverview = {
  /** The commit production runs: this dashboard's own build, else the last run that deployed. */
  live: string | null;
  main: string;
  /** Main's own commits (merges, first parents) that production doesn't run yet, newest first. */
  pending: PendingCommit[];
  /** More commits are pending than GitHub's compare returned. */
  pendingTruncated: boolean;
  runs: DeployRun[];
};

function ciState(run: GitHubRun | undefined): CiState {
  if (!run) return "none";
  if (run.status !== "completed") return "running";
  if (run.conclusion === "success") return "success";
  if (run.conclusion === "cancelled" || run.conclusion === "skipped") return "canceled";
  return "failure";
}

type RunWithJobs = { run: GitHubRun; jobs: GitHubJob[]; phase: DeployPhase };

/**
 * Jobs of finished runs, by run id and attempt: they never change, and the page refreshes itself
 * while a run is active (an installation token gets 5,000 requests an hour).
 */
const finishedJobs = new Map<string, GitHubJob[]>();

async function recentRuns(): Promise<RunWithJobs[]> {
  const { workflow_runs: runs } = await github<{ workflow_runs: GitHubRun[] }>(
    `${REPO}/actions/workflows/${DEPLOY_WORKFLOW}/runs?branch=${DEPLOY_BRANCH}&per_page=${RUNS_SHOWN}`,
  );
  return Promise.all(
    runs.map(async (run) => {
      const key = `${run.id}:${run.run_attempt ?? 1}`;
      let jobs = finishedJobs.get(key);
      if (!jobs) {
        ({ jobs } = await github<{ jobs: GitHubJob[] }>(
          `${REPO}/actions/runs/${run.id}/jobs?per_page=30`,
        ));
        if (run.status === "completed") {
          finishedJobs.set(key, jobs);
          if (finishedJobs.size > 100) {
            finishedJobs.delete(finishedJobs.keys().next().value as string);
          }
        }
      }
      return { run, jobs, phase: deployRunPhase(run, jobs) };
    }),
  );
}

async function mainSha(): Promise<string> {
  return (await github<{ sha: string }>(`${REPO}/commits/${DEPLOY_BRANCH}`)).sha;
}

/** Everything the deploys page shows. Throws `GitHubError` when GitHub can't be read. */
export async function getDeployOverview(): Promise<DeployOverview> {
  const [runs, ci, main] = await Promise.all([
    recentRuns(),
    github<{ workflow_runs: GitHubRun[] }>(
      `${REPO}/actions/workflows/${CI_WORKFLOW}/runs?branch=${DEPLOY_BRANCH}&event=push&per_page=50`,
    ),
    mainSha(),
  ]);
  const ciBySha = new Map<string, GitHubRun>();
  for (const run of ci.workflow_runs)
    if (!ciBySha.has(run.head_sha)) ciBySha.set(run.head_sha, run);

  // The build's commit (NEXT_DEPLOYMENT_ID, inlined by `next build`); unset in development.
  const lastDeployed = runs.find((entry) => ROLLED_OUT_PHASES.includes(entry.phase));
  const live =
    process.env.NEXT_DEPLOYMENT_ID ||
    (lastDeployed ? deployedCommit(lastDeployed.run, lastDeployed.jobs) : null);

  let commits: GitHubCommit[] = [];
  if (live && live !== main) {
    const compare = await github<{ commits: GitHubCommit[]; ahead_by: number }>(
      `${REPO}/compare/${live}...${main}`,
    );
    commits = compare.commits;
    // The compare lists the oldest 250 commits only: past that, main's latest 100 instead (the
    // chain then stops before reaching production's commit).
    if (compare.commits.length < compare.ahead_by) {
      commits = await github<GitHubCommit[]>(`${REPO}/commits?sha=${main}&per_page=100`);
    }
  }
  const chain = firstParentChain(commits, main, live);
  const pending = chain.map((commit): PendingCommit => {
    const summary = commitSummary(commit.commit.message);
    return {
      sha: commit.sha,
      url: commit.html_url,
      title: summary.title,
      pullRequest: summary.pullRequest,
      author: {
        name: commit.author?.login ?? commit.commit.author?.name ?? "unknown",
        avatarUrl: commit.author?.avatar_url ?? null,
      },
      committedAt: commit.commit.author?.date ?? null,
      ci: ciState(ciBySha.get(commit.sha)),
    };
  });

  const starts = runs.map((entry) => latestProductionJobAt(entry.jobs)).filter((at) => at !== null);
  const lastDeployAt = starts.length > 0 ? new Date(Math.max(...starts.map(Number))) : null;

  return {
    live,
    main,
    pending,
    pendingTruncated: chain.length > 0 && chain.at(-1)?.parents[0]?.sha !== live,
    runs: runs.map(({ run, jobs, phase }): DeployRun => {
      const trigger =
        run.event === "push" ? "push" : isImageTagRun(run, jobs) ? "image_tag" : "manual";
      return {
        id: run.id,
        url: run.html_url,
        phase,
        commit: deployedCommit(run, jobs),
        title:
          trigger === "push"
            ? commitSummary(run.head_commit?.message ?? run.display_title).title
            : trigger === "image_tag"
              ? "Redeploy of an earlier commit"
              : "Deploy now",
        trigger,
        actor: run.triggering_actor?.login ?? null,
        createdAt: run.created_at,
        shipsAt:
          phase === "waiting"
            ? batchShipsAt(new Date(run.created_at), lastDeployAt).toISOString()
            : null,
      };
    }),
  };
}

/** Push runs that haven't reached their deploy job. */
async function pendingPushRuns(): Promise<Set<number>> {
  return new Set(
    (await recentRuns())
      .filter(({ run, phase }) => run.event === "push" && CANCELABLE_PHASES.includes(phase))
      .map(({ run }) => run.id),
  );
}

/**
 * Dispatches the Deploy workflow, then cancels the push runs that were waiting before it: their
 * commits were on main already, so the dispatch either ships them or (a redeploy) would be undone
 * by them. Pushes made after the dispatch keep their runs. Only runs still before their deploy job
 * are canceled (checked again after the dispatch).
 */
async function dispatchAndCancelPending(
  inputs?: Record<string, string>,
): Promise<{ run: { id: number; commit: string | null } | null; canceledRunIds: number[] }> {
  const before = await pendingPushRuns();
  // GitHub answers with the run it created (204 and no body from older API versions).
  const dispatched = await github<{ workflow_run_id?: number } | undefined>(
    `${REPO}/actions/workflows/${DEPLOY_WORKFLOW}/dispatches`,
    { method: "POST", body: { ref: DEPLOY_BRANCH, ...(inputs ? { inputs } : {}) } },
  );
  // The dispatch happened: from here on nothing may throw, or the action would report a failure
  // (inviting a second dispatch) and skip its audit event.
  let run: { id: number; commit: string | null } | null = null;
  const runId = dispatched?.workflow_run_id;
  if (runId) {
    const commit = await github<{ head_sha: string }>(`${REPO}/actions/runs/${runId}`).then(
      (created) => created.head_sha,
      () => null,
    );
    run = { id: runId, commit };
  }
  let still: Set<number>;
  try {
    still = await pendingPushRuns();
  } catch (error) {
    console.error("[web] Deploy dispatched, but the runs to cancel couldn't be read:", error);
    return { run, canceledRunIds: [] };
  }
  const canceled: number[] = [];
  await Promise.all(
    [...before]
      .filter((id) => still.has(id))
      .map(async (id) => {
        // Already finished (409) or gone: nothing to cancel.
        await github(`${REPO}/actions/runs/${id}/cancel`, { method: "POST" }).then(
          () => canceled.push(id),
          () => {},
        );
      }),
  );
  return { run, canceledRunIds: canceled };
}

/**
 * Dispatches the Deploy workflow for main's tip, skipping the batch wait. `commit` is the one its
 * run builds (main when the run started), or main just before the dispatch if GitHub didn't say.
 */
export async function deployMainNow(): Promise<{
  commit: string;
  runId: number | null;
  canceledRunIds: number[];
}> {
  const before = await mainSha();
  const { run, canceledRunIds } = await dispatchAndCancelPending();
  return { commit: run?.commit ?? before, runId: run?.id ?? null, canceledRunIds };
}

/**
 * Dispatches the Deploy workflow with `image_tag`: production goes back to `commit`'s images
 * (already built), until the next deploy of main.
 */
export async function redeployCommit(
  commit: string,
): Promise<{ runId: number | null; canceledRunIds: number[] }> {
  const { run, canceledRunIds } = await dispatchAndCancelPending({ image_tag: commit });
  return { runId: run?.id ?? null, canceledRunIds };
}

/** Commits a past run deployed (other than `live`): the only ones offered for redeploying. */
export function redeployableCommits(overview: DeployOverview): Set<string> {
  return new Set(
    overview.runs.flatMap((run) =>
      ROLLED_OUT_PHASES.includes(run.phase) && run.commit && run.commit !== overview.live
        ? [run.commit]
        : [],
    ),
  );
}
