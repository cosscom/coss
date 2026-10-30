import { describe, expect, mock, test } from "bun:test";
import { generateKeyPairSync, verify } from "node:crypto";
import {
  batchShipsAt,
  commitSummary,
  currentStep,
  type DeployPhase,
  deployedCommit,
  deployRunPhase,
  elapsedMs,
  failureLogExcerpt,
  findPreviousRollout,
  firstParentChain,
  type GitHubCommit,
  type GitHubJob,
  type GitHubRun,
  imageTagRunName,
  isImageTagRun,
  latestProductionJobAt,
  latestRolloutBefore,
  rolloutTimes,
  stepState,
} from "../src/lib/deploy-runs";
import { formatElapsed } from "../src/lib/format";

mock.module("server-only", () => ({}));
const { githubAppJwt, githubAppPrivateKey } = await import("../src/lib/github-app");

const SHA = "a".repeat(40);
const OLD = "b".repeat(40);

function run(overrides: Partial<GitHubRun> = {}): GitHubRun {
  return {
    id: 1,
    status: "completed",
    conclusion: "success",
    event: "push",
    head_sha: SHA,
    display_title: "Merge pull request #1 from cosscom/x",
    created_at: "2026-10-15T12:00:00Z",
    html_url: "https://github.com/cosscom/coss/actions/runs/1",
    ...overrides,
  };
}

function job(name: string, status: string, conclusion: string | null = null): GitHubJob {
  return { name, status, conclusion };
}

const rollout = (conclusion: string): GitHubJob => ({
  ...job("deploy", "completed", "success"),
  steps: [{ name: "Roll out", status: "completed", conclusion }],
});

describe("deployRunPhase", () => {
  const cases: [string, Partial<GitHubRun>, GitHubJob[], DeployPhase][] = [
    ["prepare only", { status: "in_progress" }, [job("prepare", "in_progress")], "queued"],
    [
      "waiting in the gate",
      { status: "in_progress" },
      [job("prepare", "completed", "success"), job("gate", "in_progress")],
      "waiting",
    ],
    [
      "builds waiting for their runners",
      { status: "in_progress" },
      [job("gate", "completed", "success"), job("build (web)", "queued")],
      "building",
    ],
    [
      "deploy job waiting for its turn",
      { status: "in_progress" },
      [
        job("gate", "completed", "success"),
        job("build (web)", "completed", "success"),
        job("deploy", "waiting"),
      ],
      "deploying",
    ],
    [
      "a redeploy (no gate, builds skipped)",
      { status: "in_progress", event: "workflow_dispatch" },
      [job("build", "completed", "skipped"), job("deploy", "in_progress")],
      "deploying",
    ],
    ["rolled out", {}, [rollout("success")], "deployed"],
    [
      "rolled out, then the routing check failed",
      { conclusion: "failure" },
      [rollout("success")],
      "deployed_with_errors",
    ],
    [
      "superseded at the gate",
      {},
      [job("gate", "completed", "success"), job("deploy", "completed", "skipped")],
      "skipped",
    ],
    ["skipped in the deploy job", {}, [rollout("skipped")], "skipped"],
    ["failed", { conclusion: "failure" }, [rollout("failure")], "failed"],
    ["canceled", { conclusion: "cancelled" }, [job("gate", "completed", "cancelled")], "canceled"],
  ];
  for (const [name, overrides, jobs, phase] of cases) {
    test(name, () => expect(deployRunPhase(run(overrides), jobs)).toBe(phase));
  }
});

describe("deployedCommit", () => {
  const built = [job("build (web)", "completed", "success")];
  const notBuilt = [job("build", "completed", "skipped")];

  test("a push ships its commit", () => {
    expect(deployedCommit(run(), built)).toBe(SHA);
    expect(isImageTagRun(run(), built)).toBe(false);
  });

  test("Deploy now ships the commit it built", () => {
    const dispatch = run({ event: "workflow_dispatch", display_title: "Deploy" });
    expect(deployedCommit(dispatch, built)).toBe(SHA);
    expect(isImageTagRun(dispatch, built)).toBe(false);
  });

  test("a redeploy ships the commit in its run name", () => {
    const redeploy = run({ event: "workflow_dispatch", display_title: imageTagRunName(OLD) });
    expect(deployedCommit(redeploy, notBuilt)).toBe(OLD);
    expect(isImageTagRun(redeploy, notBuilt)).toBe(true);
  });

  test("an older redeploy that doesn't name its commit is unknown, never its own commit", () => {
    const redeploy = run({ event: "workflow_dispatch", display_title: "Deploy" });
    expect(deployedCommit(redeploy, notBuilt)).toBeNull();
    expect(isImageTagRun(redeploy, notBuilt)).toBe(true);
  });

  test("a push whose message looks like a run name still ships its own commit", () => {
    expect(deployedCommit(run({ display_title: imageTagRunName(OLD) }), built)).toBe(SHA);
  });
});

describe("commitSummary", () => {
  test("a merged pull request's title and number", () => {
    expect(
      commitSummary("Merge pull request #106 from cosscom/smtp-tls\n\nSMTP relay: TLS 1.2 only\n"),
    ).toEqual({ title: "SMTP relay: TLS 1.2 only", pullRequest: 106 });
  });

  test("any other commit's first line", () => {
    expect(commitSummary("Fix the gate\n\nBody")).toEqual({
      title: "Fix the gate",
      pullRequest: null,
    });
  });
});

describe("firstParentChain", () => {
  const commit = (sha: string, ...parents: string[]): GitHubCommit => ({
    sha,
    parents: parents.map((parent) => ({ sha: parent })),
    html_url: "",
    author: null,
    commit: { message: sha, author: null },
  });
  // live ← m1 ← m2 (main), m2 merging the branch b1 ← b2.
  const commits = [
    commit("b1", "live"),
    commit("m1", "live"),
    commit("b2", "b1"),
    commit("m2", "m1", "b2"),
  ];

  test("main's own commits since the base, newest first", () => {
    expect(firstParentChain(commits, "m2", "live").map((c) => c.sha)).toEqual(["m2", "m1"]);
  });

  test("stops where the compare ran out", () => {
    expect(firstParentChain([commit("m2", "m1")], "m2", "live").map((c) => c.sha)).toEqual(["m2"]);
  });
});

describe("batch timing", () => {
  const pushed = new Date("2026-10-15T12:00:00Z");

  test("twenty quiet minutes after the push", () => {
    expect(batchShipsAt(pushed, new Date("2026-10-15T11:50:00Z")).toISOString()).toBe(
      "2026-10-15T12:20:00.000Z",
    );
  });

  test("an hour after the last deploy when that comes first", () => {
    expect(batchShipsAt(pushed, new Date("2026-10-15T11:05:00Z")).toISOString()).toBe(
      "2026-10-15T12:05:00.000Z",
    );
  });

  test("at once when no earlier deploy is known", () => {
    expect(batchShipsAt(pushed, null).toISOString()).toBe(pushed.toISOString());
  });

  test("the last deploy is when its latest build or deploy job that ran started", () => {
    expect(
      latestProductionJobAt([
        { ...job("gate", "completed", "success"), started_at: "2026-10-15T11:00:00Z" },
        { ...job("build (web)", "completed", "success"), started_at: "2026-10-15T11:10:00Z" },
        { ...job("deploy", "completed", "success"), started_at: "2026-10-15T11:15:00Z" },
      ])?.toISOString(),
    ).toBe("2026-10-15T11:15:00.000Z");
    expect(
      latestProductionJobAt([
        { ...job("build", "completed", "skipped"), started_at: "2026-10-15T11:10:00Z" },
        { ...job("deploy", "completed", "skipped"), started_at: "2026-10-15T11:10:00Z" },
      ]),
    ).toBeNull();
    expect(latestProductionJobAt([job("gate", "completed")])).toBeNull();
  });
});

describe("run details", () => {
  test("stepState", () => {
    expect(stepState({ status: "queued", conclusion: null })).toBe("queued");
    expect(stepState({ status: "waiting", conclusion: null })).toBe("queued");
    expect(stepState({ status: "in_progress", conclusion: null })).toBe("running");
    expect(stepState({ status: "completed", conclusion: "success" })).toBe("success");
    expect(stepState({ status: "completed", conclusion: "skipped" })).toBe("skipped");
    expect(stepState({ status: "completed", conclusion: "cancelled" })).toBe("canceled");
    expect(stepState({ status: "completed", conclusion: "timed_out" })).toBe("failure");
  });

  test("currentStep prefers the deploy job's running step", () => {
    const steps = (running: string) => [
      { name: "Set up job", status: "completed", conclusion: "success" },
      { name: running, status: "in_progress", conclusion: null },
    ];
    expect(
      currentStep([
        { ...job("build (web)", "in_progress"), steps: steps("Build and push web") },
        { ...job("deploy", "in_progress"), steps: steps("Migrate") },
      ]),
    ).toEqual({ job: "deploy", step: "Migrate" });
    expect(
      currentStep([{ ...job("build (web)", "in_progress"), steps: steps("Build and push web") }]),
    ).toEqual({ job: "build (web)", step: "Build and push web" });
    expect(currentStep([job("deploy", "queued")])).toBeNull();
  });

  test("elapsedMs and formatElapsed", () => {
    const now = new Date("2026-10-15T12:10:00Z");
    expect(elapsedMs("2026-10-15T12:00:00Z", "2026-10-15T12:04:12Z", now)).toBe(252_000);
    expect(elapsedMs("2026-10-15T12:00:00Z", null, now)).toBe(600_000);
    expect(elapsedMs(null, null, now)).toBeNull();
    expect(formatElapsed(45_000)).toBe("45s");
    expect(formatElapsed(252_000)).toBe("4m 12s");
    expect(formatElapsed(3_780_000)).toBe("1h 3m");
  });

  test("failureLogExcerpt ends at the last error and drops GitHub's markup", () => {
    const log = [
      "\uFEFF2026-10-15T11:59:59.0Z Current runner version: '2.337.0'",
      "2026-10-15T11:59:59.1Z ##[group]Runner Image",
      "2026-10-15T11:59:59.2Z Image: ubuntu-24.04",
      "2026-10-15T11:59:59.3Z ##[endgroup]",
      "2026-10-15T11:59:59.4Z ##[group]Run infra/scripts/ecs-task.sh",
      "2026-10-15T11:59:59.5Z ##[endgroup]",
      "2026-10-15T11:59:59.6Z migrated",
      "2026-10-15T12:00:00.1234567Z ##[group]Run infra/scripts/ecs-deploy.sh",
      "2026-10-15T12:00:00.2Z \u001b[36;1minfra/scripts/ecs-deploy.sh abc api\u001b[0m",
      "2026-10-15T12:00:00.2Z env:",
      "2026-10-15T12:00:00.3Z ##[endgroup]",
      "2026-10-15T12:00:01.0Z \u001b[31mapi: rollout failed\u001b[0m",
      "2026-10-15T12:00:01.1Z ##[error]Process completed with exit code 1.",
      "2026-10-15T12:00:02.0Z Post job cleanup.",
      "",
    ].join("\n");
    expect(failureLogExcerpt(log)).toEqual([
      // From the failing step's start; its echoed script and env are left out, colours too.
      { text: "Run infra/scripts/ecs-deploy.sh", error: false },
      { text: "api: rollout failed", error: false },
      { text: "Process completed with exit code 1.", error: true },
    ]);
    expect(failureLogExcerpt(log, 2).map((line) => line.text)).toEqual([
      "api: rollout failed",
      "Process completed with exit code 1.",
    ]);
    // Without an error line: the end.
    expect(failureLogExcerpt("one\ntwo\nthree\n", 2).map((line) => line.text)).toEqual([
      "two",
      "three",
    ]);
  });
});

describe("rollout order", () => {
  const rolledOut = (
    startedAt: string,
    completedAt: string,
    conclusion = "success",
  ): GitHubJob => ({
    ...job("deploy", "completed", conclusion),
    steps: [
      { name: "Migrate", status: "completed", conclusion: "success" },
      {
        name: "Roll out",
        status: "completed",
        conclusion,
        started_at: startedAt,
        completed_at: completedAt,
      },
    ],
  });

  test("rolloutTimes", () => {
    expect(rolloutTimes([rolledOut("2026-10-15T12:00:00Z", "2026-10-15T12:02:00Z")])).toEqual({
      startedAt: new Date("2026-10-15T12:00:00Z"),
      finishedAt: new Date("2026-10-15T12:02:00Z"),
    });
    // A failed rollout started, but production didn't move.
    expect(
      rolloutTimes([rolledOut("2026-10-15T12:00:00Z", "2026-10-15T12:02:00Z", "failure")]),
    ).toEqual({ startedAt: new Date("2026-10-15T12:00:00Z"), finishedAt: null });
    expect(rolloutTimes([job("build (web)", "completed", "success")])).toEqual({
      startedAt: null,
      finishedAt: null,
    });
  });

  test("latestRolloutBefore orders by when rollouts finished, not when runs were created", () => {
    // `rerun` was created first but re-run (and rolled out) after `newer`.
    const newer = {
      id: "newer",
      jobs: [rolledOut("2026-10-15T12:00:00Z", "2026-10-15T12:02:00Z")],
    };
    const rerun = {
      id: "rerun",
      jobs: [rolledOut("2026-10-15T13:00:00Z", "2026-10-15T13:02:00Z")],
    };
    const failed = { id: "failed", jobs: [job("gate", "completed", "failure")] };
    const entries = [newer, failed, rerun];
    expect(latestRolloutBefore(entries, new Date("2026-10-15T14:00:00Z"))?.entry.id).toBe("rerun");
    expect(latestRolloutBefore(entries, new Date("2026-10-15T12:30:00Z"))?.entry.id).toBe("newer");
    expect(latestRolloutBefore(entries, new Date("2026-10-15T12:01:00Z"))).toBeNull();
  });
});

describe("findPreviousRollout", () => {
  const at = (minute: number) => new Date(Date.UTC(2026, 9, 15, 12, minute)).toISOString();
  /** A deploy job that rolled out from `minute` to `minute + 2`, or one that never got there. */
  const jobsAt = (minute: number | null): GitHubJob[] =>
    minute === null
      ? [job("gate", "completed", "failure")]
      : [
          {
            ...job("deploy", "completed", "success"),
            steps: [
              {
                name: "Roll out",
                status: "completed",
                conclusion: "success",
                started_at: at(minute),
                completed_at: at(minute + 2),
              },
            ],
          },
        ];
  /** Runs by id: each attempt's rollout minute (`null`: none), the latest last. */
  function fixture(attempts: Record<number, (number | null)[]>) {
    const runs = Object.entries(attempts).map(([id, minutes]) =>
      run({
        id: Number(id),
        run_attempt: minutes.length,
        created_at: at(Number(id)),
        updated_at: at((minutes.at(-1) ?? Number(id)) + 3),
      }),
    );
    const loads: string[] = [];
    const load = async (of: GitHubRun, attempt?: number) => {
      const number = attempt ?? of.run_attempt ?? 1;
      loads.push(`${of.id}:${number}`);
      return { run: of, attempt: number, jobs: jobsAt(attempts[of.id]?.[number - 1] ?? null) };
    };
    return { runs, load, loads };
  }
  const found = (result: { best: { entry: { run: GitHubRun; attempt: number } } | null }) =>
    result.best ? `${result.best.entry.run.id}:${result.best.entry.attempt}` : null;

  test("the latest rollout before the reference, reading as few runs as it can", async () => {
    const { runs, load, loads } = fixture({ 1: [1], 10: [10], 20: [null], 30: [30] });
    const viewed = runs.find((candidate) => candidate.id === 30) as GitHubRun;
    const result = await findPreviousRollout(viewed, runs, new Date(at(30)), load);
    expect(found(result)).toBe("10:1");
    // Run 1's last change is before run 10's rollout: never read.
    expect(loads).toEqual(["20:1", "10:1"]);
  });

  test("reading ahead finds the same rollout, loading each run once", async () => {
    const { runs, load, loads } = fixture({ 1: [1], 10: [10], 20: [null], 30: [30] });
    const viewed = runs.find((candidate) => candidate.id === 30) as GitHubRun;
    const result = await findPreviousRollout(viewed, runs, new Date(at(30)), load, 8);
    expect(found(result)).toBe("10:1");
    expect(loads).toEqual(["20:1", "10:1", "1:1"]);
  });

  test("an earlier run re-run after the viewed one rolled out: its first attempt counts", async () => {
    // Run 10 rolled out at 10, run 20 at 20, then run 10 was re-run and rolled out at 40.
    const { runs, load } = fixture({ 1: [1], 10: [10, 40], 20: [20] });
    const viewed = runs.find((candidate) => candidate.id === 20) as GitHubRun;
    expect(found(await findPreviousRollout(viewed, runs, new Date(at(20)), load))).toBe("10:1");
  });

  test("the viewed run's own earlier rollout (its failed later steps were re-run)", async () => {
    const { runs, load } = fixture({ 1: [1], 10: [10, 15] });
    const viewed = runs.find((candidate) => candidate.id === 10) as GitHubRun;
    expect(found(await findPreviousRollout(viewed, runs, new Date(at(15)), load))).toBe("10:1");
  });

  test("none before the reference", async () => {
    const { runs, load } = fixture({ 10: [null], 20: [20] });
    const viewed = runs.find((candidate) => candidate.id === 20) as GitHubRun;
    expect(found(await findPreviousRollout(viewed, runs, new Date(at(20)), load))).toBeNull();
  });
});

describe("githubAppJwt", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();

  test("an RS256 token GitHub accepts: issued a minute back, under ten minutes long", () => {
    const now = Date.parse("2026-10-15T12:00:00Z");
    const token = githubAppJwt("12345", githubAppPrivateKey(pem), now);
    const [header = "", payload = "", signature = ""] = token.split(".");
    expect(JSON.parse(Buffer.from(header, "base64url").toString())).toEqual({
      alg: "RS256",
      typ: "JWT",
    });
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    expect(claims).toEqual({ iat: now / 1000 - 60, exp: now / 1000 + 540, iss: "12345" });
    expect(
      verify(
        "sha256",
        Buffer.from(`${header}.${payload}`),
        publicKey,
        Buffer.from(signature, "base64url"),
      ),
    ).toBe(true);
  });

  test("reads a key kept on one line with \\n escapes", () => {
    const oneLine = pem.trim().replaceAll("\n", "\\n");
    expect(githubAppPrivateKey(oneLine).asymmetricKeyType).toBe("rsa");
  });
});
