import { describe, expect, test } from "bun:test";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { detectPackageManager, installCommand, setEnvVar } from "../src/commands/init.ts";
import type { CliIo } from "../src/io.ts";
import { run } from "../src/run.ts";
import { apiError, environmentObject, fakeFetch, testIo } from "./helpers.ts";

const PROJECT_KEY = `coss_test_${"p".repeat(64)}`;

type Exec = { command: string; args: string[]; cwd: string };

/** A project directory, the dashboard and API, and a recording `exec` (git: not ignored). */
async function project(
  files: Record<string, string>,
  options: { mode?: "live" | "sandbox"; exec?: (call: Exec) => number | null } = {},
) {
  let tokenRequests = 0;
  const api = fakeFetch({
    "POST https://coss.com/api/cli/v1/token": () => {
      tokenRequests++;
      return { api_key: PROJECT_KEY, api_key_id: "key_p", name: "my-app · coss init" };
    },
    "GET /v1/environment": ({ headers }) =>
      headers.get("authorization") === `Bearer ${PROJECT_KEY}`
        ? environmentObject(options.mode ?? "sandbox")
        : apiError(401, "authentication_error", "invalid_api_key"),
    "DELETE /v1/api_key": { object: "api_key", id: "key_p", deleted: true },
  });
  const calls: Exec[] = [];
  const io = testIo({
    fetch: api.fetch,
    answers: ["the-code"],
    exec: async (command, args, { cwd }) => {
      const call = { command, args, cwd };
      calls.push(call);
      return options.exec ? options.exec(call) : command === "git" ? 1 : 0;
    },
  });
  for (const [name, text] of Object.entries(files)) {
    await mkdir(join(io.cwd, name, ".."), { recursive: true });
    await writeFile(join(io.cwd, name), text);
  }
  return { io, api, calls, tokens: () => tokenRequests };
}

const NEXT_APP = JSON.stringify({ name: "@acme/my-app", dependencies: { next: "16.0.0" } });

describe("coss init", () => {
  test("a Next.js project: a development key in .env.local, the SDK installed", async () => {
    const { io, api, calls } = await project({ "package.json": NEXT_APP, "bun.lock": "" });
    expect(await run(["init", "--no-browser"], io)).toBe(0);

    // The approval page is asked for a project key (sandbox environments only, named for it).
    const link = /https:\/\/coss\.com\/app\/authorize\/cli\?\S+/.exec(io.errors())?.[0] ?? "";
    expect(new URL(link).searchParams.get("project")).toBe("my-app");
    expect(new URL(link).searchParams.get("mode")).toBe("code");
    expect(api.requests.find((r) => r.url.pathname === "/api/cli/v1/token")?.body).toMatchObject({
      code: "the-code",
    });

    const envFile = join(io.cwd, ".env.local");
    expect(await readFile(envFile, "utf8")).toBe(`COSS_API_KEY=${PROJECT_KEY}\n`);
    expect((await stat(envFile)).mode & 0o777).toBe(0o600);
    expect(calls).toEqual([
      { command: "git", args: ["check-ignore", "-q", envFile], cwd: io.cwd },
      { command: "bun", args: ["add", "coss"], cwd: io.cwd },
    ]);
    expect(io.output()).toContain(
      "Saved a development key of Acme / Default / Development (sandbox) to .env.local as COSS_API_KEY.",
    );
    expect(io.output()).toContain("Installed the coss package.");
    expect(io.output()).toContain('import { Coss } from "coss";');
    expect(io.output()).toContain("coss listen --forward-to");
    expect(io.errors()).toContain(".env.local isn't ignored by git");
    // The key is written, never shown.
    expect(io.output() + io.errors()).not.toContain(PROJECT_KEY);
  });

  test("keeps a key the env file already has, unless --force", async () => {
    const existing = "# app\nDATABASE_URL=postgres://x\nCOSS_API_KEY=coss_test_old\nOTHER=1";
    const kept = await project({ ".env": existing }, { exec: () => 0 });
    expect(await run(["init"], kept.io)).toBe(0);
    expect(kept.tokens()).toBe(0);
    expect(await readFile(join(kept.io.cwd, ".env"), "utf8")).toBe(existing);
    expect(kept.io.errors()).toContain(".env already has COSS_API_KEY: kept it");
    expect(kept.io.errors()).toContain("No package.json here");
    expect(kept.io.errors()).not.toContain("isn't ignored by git");

    const forced = await project({ ".env": existing }, { exec: () => 0 });
    expect(await run(["init", "--force", "--no-browser"], forced.io)).toBe(0);
    expect(await readFile(join(forced.io.cwd, ".env"), "utf8")).toBe(
      `# app\nDATABASE_URL=postgres://x\nCOSS_API_KEY=${PROJECT_KEY}\nOTHER=1`,
    );
  });

  test("never writes a live key: it's revoked", async () => {
    const { io, api } = await project({ "package.json": NEXT_APP }, { mode: "live" });
    expect(await run(["init", "--no-browser"], io)).toBe(1);
    expect(io.errors()).toContain("is live, so its key was revoked");
    expect(
      api.requests.some((r) => r.method === "DELETE" && r.url.pathname === "/v1/api_key"),
    ).toBe(true);
    expect(await readFile(join(io.cwd, ".env.local"), "utf8").catch(() => null)).toBeNull();
  });

  test("--env-file, --no-install, a local API remembered, and JSON", async () => {
    const { io, calls } = await project(
      { "package.json": JSON.stringify({ name: "worker" }) },
      { exec: () => 0 },
    );
    io.env.COSS_BASE_URL = "http://localhost:3001";
    expect(
      await run(
        ["init", "--env-file", "config/dev.env", "--no-install", "--no-browser", "--json"],
        io,
      ),
    ).toBe(0);
    const envFile = join(io.cwd, "config/dev.env");
    expect(await readFile(envFile, "utf8")).toBe(
      `COSS_API_KEY=${PROJECT_KEY}\nCOSS_BASE_URL=http://localhost:3001\n`,
    );
    expect(calls.map((call) => call.command)).toEqual(["git"]);
    expect(JSON.parse(io.output())).toEqual({
      env_file: envFile,
      key: {
        id: "key_1",
        name: "my-app · coss init",
        environment: "Acme / Default / Development (sandbox)",
      },
      installed: null,
      ignored_by_git: true,
    });
  });

  test("a failed install says so (after the key is saved)", async () => {
    const { io } = await project(
      { "package.json": JSON.stringify({ name: "x" }), "package-lock.json": "{}" },
      { exec: (call) => (call.command === "npm" ? 1 : null) },
    );
    expect(await run(["init", "--no-browser"], io)).toBe(1);
    expect(io.errors()).toContain("`npm install coss` failed (exit code 1)");
    expect(await readFile(join(io.cwd, ".env"), "utf8")).toContain("COSS_API_KEY=");
  });

  test("skips the install when coss is already a dependency", async () => {
    const pkg = JSON.stringify({ name: "x", dependencies: { coss: "^0.6.0" } });
    const { io, calls } = await project({
      "package.json": pkg,
      ".env": "COSS_API_KEY=coss_test_k\n",
    });
    expect(await run(["init"], io)).toBe(0);
    expect(calls.map((call) => call.command)).toEqual(["git"]);
    expect(io.errors()).toContain("coss is already a dependency.");
  });
});

describe("package managers", () => {
  async function dir(files: string[], io: CliIo = testIo()): Promise<string> {
    for (const file of files) {
      await mkdir(join(io.cwd, file, ".."), { recursive: true });
      await writeFile(join(io.cwd, file), "");
    }
    return io.cwd;
  }

  test("the nearest lockfile, then packageManager, then npm", async () => {
    expect(await detectPackageManager(await dir(["pnpm-lock.yaml"]), {})).toBe("pnpm");
    expect(await detectPackageManager(await dir(["yarn.lock"]), {})).toBe("yarn");
    expect(await detectPackageManager(await dir(["bun.lockb"]), {})).toBe("bun");
    // A workspace package: the root's lockfile.
    const root = await dir(["bun.lock", "apps/web/package.json"]);
    expect(await detectPackageManager(join(root, "apps/web"), {})).toBe("bun");
    const bare = await dir([]);
    expect(await detectPackageManager(bare, { packageManager: "pnpm@10.0.0" })).toBe("pnpm");
    expect(await detectPackageManager(bare, {})).toBe("npm");
    expect(installCommand("npm")).toEqual(["npm", ["install", "coss"]]);
    expect(installCommand("yarn")).toEqual(["yarn", ["add", "coss"]]);
  });

  test("env vars are replaced in place or appended", () => {
    expect(setEnvVar("", "A", "1")).toBe("A=1\n");
    expect(setEnvVar("B=2", "A", "1")).toBe("B=2\nA=1\n");
    expect(setEnvVar("export A=old\nB=2\n", "A", "$new")).toBe("A=$new\nB=2\n");
  });
});
