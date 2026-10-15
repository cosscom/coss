import { describe, expect, mock, test } from "bun:test";
import { generateKeyPairSync, verify } from "node:crypto";
import {
  batchShipsAt,
  commitSummary,
  type DeployPhase,
  deployedCommit,
  deployRunPhase,
  firstParentChain,
  type GitHubCommit,
  type GitHubJob,
  type GitHubRun,
  imageTagRunName,
  isImageTagRun,
  shippingStartedAt,
} from "../src/lib/deploy-runs";

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

  test("as soon as CI passes when no earlier deploy is known", () => {
    expect(batchShipsAt(pushed, null).toISOString()).toBe(pushed.toISOString());
  });

  test("the last deploy is when its first build or deploy job started", () => {
    expect(
      shippingStartedAt([
        { ...job("gate", "completed"), started_at: "2026-10-15T11:00:00Z" },
        { ...job("build (web)", "completed"), started_at: "2026-10-15T11:10:00Z" },
        { ...job("deploy", "completed"), started_at: "2026-10-15T11:15:00Z" },
      ])?.toISOString(),
    ).toBe("2026-10-15T11:10:00.000Z");
    expect(shippingStartedAt([job("gate", "completed")])).toBeNull();
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
