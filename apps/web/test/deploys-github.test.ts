import { afterAll, afterEach, describe, expect, mock, test } from "bun:test";
import { generateKeyPairSync } from "node:crypto";
import type { GitHubJob, GitHubRun } from "../src/lib/deploy-runs";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
mock.module("server-only", () => ({}));
mock.module("@/env", () => ({
  env: {
    DEPLOY_GITHUB_APP_ID: "1",
    DEPLOY_GITHUB_APP_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }),
  },
}));
const { deployMainNow, getDeployRun, GitHubError } = await import("../src/lib/deploys");

const SHA = "a".repeat(40);

/** A fake GitHub: each route answers a status and body, a function of how often it was asked. */
type Route = (asked: number) => { status: number; body?: unknown };
let routes: [method: string, path: RegExp, route: Route][] = [];
let requests: string[] = [];

const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(String(input));
  const method = init?.method ?? "GET";
  const key = `${method} ${url.pathname}${url.search}`;
  requests.push(key);
  const all: typeof routes = [
    ["GET", /\/installation$/, () => ({ status: 200, body: { id: 7 } })],
    [
      "POST",
      /\/access_tokens$/,
      () => ({ status: 201, body: { token: "t", expires_at: "2099-01-01T00:00:00Z" } }),
    ],
    ...routes,
  ];
  const match = all.find(([m, path]) => m === method && path.test(url.pathname + url.search));
  if (!match) return new Response(JSON.stringify({ message: "Not Found" }), { status: 404 });
  const asked = requests.filter((request) => request === key).length;
  const { status, body } = match[2](asked);
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}) as typeof fetch;
afterEach(() => {
  routes = [];
  requests = [];
});
afterAll(() => {
  globalThis.fetch = originalFetch;
});

const ok = (body: unknown) => () => ({ status: 200, body });
const badGateway = () => ({ status: 502, body: { message: "Server Error" } });

function run(id: number, overrides: Partial<GitHubRun> = {}): GitHubRun {
  return {
    id,
    status: "in_progress",
    conclusion: null,
    event: "push",
    head_sha: SHA,
    display_title: "Merge pull request #1 from cosscom/x",
    created_at: "2026-10-30T18:00:00Z",
    updated_at: "2026-10-30T18:05:00Z",
    html_url: `https://github.com/cosscom/coss/actions/runs/${id}`,
    path: ".github/workflows/deploy.yml",
    head_branch: "main",
    ...overrides,
  };
}

const job = (name: string, status: string, conclusion: string | null = null): GitHubJob => ({
  name,
  status,
  conclusion,
});
/** Past the batch wait, building images: a push run a dispatch cancels. */
const BUILDING = [job("gate", "completed", "success"), job("build (web)", "in_progress")];

describe("reading GitHub", () => {
  test("a read GitHub answers with a 5xx is asked once more; a write never is", async () => {
    routes = [
      ["GET", /\/commits\/main$/, (asked) => (asked === 1 ? badGateway() : ok({ sha: SHA })())],
      ["GET", /\/workflows\/deploy\.yml\/runs/, ok({ workflow_runs: [] })],
      ["POST", /\/dispatches$/, () => ({ status: 500, body: { message: "Server Error" } })],
    ];
    const error = await deployMainNow().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(GitHubError);
    expect((error as InstanceType<typeof GitHubError>).status).toBe(500);
    expect(requests.filter((request) => request.endsWith("/commits/main"))).toHaveLength(2);
    expect(
      requests.filter((request) => request.startsWith("POST") && request.endsWith("/dispatches")),
    ).toHaveLength(1);
  });

  test("a run's page shows its previous jobs when GitHub fails to answer the next read", async () => {
    let jobsFail = false;
    routes = [
      ["GET", /\/actions\/runs\/501$/, ok(run(501))],
      [
        "GET",
        /\/actions\/runs\/501\/jobs/,
        () => (jobsFail ? badGateway() : ok({ jobs: BUILDING })()),
      ],
      ["GET", /\/workflows\/ci\.yml\/runs/, ok({ workflow_runs: [] })],
      ["GET", /\/workflows\/deploy\.yml\/runs/, ok({ workflow_runs: [] })],
    ];
    expect((await getDeployRun(501))?.run.phase).toBe("building");
    jobsFail = true;
    const detail = await getDeployRun(501);
    expect(detail?.run.phase).toBe("building");
    expect(detail?.changes).toEqual({ kind: "unknown" });
    // Never read before: nothing to stand in.
    routes.unshift(["GET", /\/actions\/runs\/502$/, ok(run(502))]);
    routes.push(["GET", /\/actions\/runs\/502\/jobs/, badGateway]);
    await expect(getDeployRun(502)).rejects.toBeInstanceOf(GitHubError);
  });

  test("a run is shown when what it changes can't be read", async () => {
    routes = [
      ["GET", /\/actions\/runs\/503$/, ok(run(503))],
      ["GET", /\/actions\/runs\/503\/jobs/, ok({ jobs: BUILDING })],
      ["GET", /\/workflows\/ci\.yml\/runs/, ok({ workflow_runs: [] })],
      ["GET", /\/workflows\/deploy\.yml\/runs/, badGateway],
    ];
    const detail = await getDeployRun(503);
    expect(detail?.run.phase).toBe("building");
    expect(detail?.changes.kind).toBe("unreadable");
  });

  test("a dispatch never cancels a run by its previous jobs", async () => {
    let jobsFail = false;
    routes = [
      ["GET", /\/commits\/main$/, ok({ sha: SHA })],
      ["GET", /\/workflows\/deploy\.yml\/runs/, ok({ workflow_runs: [run(601)] })],
      [
        "GET",
        /\/actions\/runs\/601\/jobs/,
        () => (jobsFail ? badGateway() : ok({ jobs: BUILDING })()),
      ],
      [
        "POST",
        /\/dispatches$/,
        () => {
          // The run may have reached its rollout by now: GitHub doesn't say.
          jobsFail = true;
          return { status: 200, body: { workflow_run_id: 700 } };
        },
      ],
      ["GET", /\/actions\/runs\/700$/, ok({ head_sha: SHA })],
      ["POST", /\/cancel$/, () => ({ status: 202 })],
    ];
    const result = await deployMainNow();
    expect(result).toEqual({ commit: SHA, runId: 700, canceledRunIds: [] });
    expect(requests.some((request) => request.endsWith("/cancel"))).toBe(false);

    // Read now, the same run is canceled.
    jobsFail = false;
    routes[3] = ["POST", /\/dispatches$/, ok({ workflow_run_id: 701 })];
    routes[4] = ["GET", /\/actions\/runs\/701$/, ok({ head_sha: SHA })];
    expect((await deployMainNow()).canceledRunIds).toEqual([601]);
  });
});
