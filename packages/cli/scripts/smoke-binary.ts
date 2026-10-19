/**
 * Runs a standalone `coss` executable through what Bun's compiled runtime could do differently
 * from Node: a fake API and dashboard on localhost, stdin from a pipe, a large output into a pipe
 * (flushed before exit), the config file, Ctrl-C, and the browser sign-in's loopback server (with
 * a stub browser). Exits 1 on the first failure.
 *
 *   bun scripts/smoke-binary.ts binaries/stage/linux-x64/coss
 */
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import pkg from "../package.json" with { type: "json" };

const KEY = `coss_test_${"a".repeat(64)}`;
const PAGE = 2000;

const ENVIRONMENT = {
  object: "environment",
  id: "env_smoke",
  name: "Development",
  slug: "development",
  mode: "sandbox",
  project: { id: "proj_1", name: "Default", slug: "default" },
  organization: { id: "org_1", name: "Acme", slug: "acme", api_version: "2026-10-01" },
  api_key: { id: "key_1", name: "coss CLI · smoke", start: "coss_test_aa" },
};

function emails(after: string | null) {
  const offset = after === null ? 0 : PAGE;
  return {
    object: "list",
    data: Array.from({ length: PAGE }, (_, i) => ({
      id: `email_${String(offset + i).padStart(6, "0")}`,
      // Enough to make the output several megabytes.
      subject: "x".repeat(1000),
    })),
    has_more: after === null,
  };
}

export async function smoke(binary: string): Promise<void> {
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(request) {
      const url = new URL(request.url);
      const route = `${request.method} ${url.pathname}`;
      if (route === "GET /v1/environment") return Response.json(ENVIRONMENT);
      if (route === "GET /v1/domains")
        return Response.json({ object: "list", data: [], has_more: false });
      if (route === "POST /v1/emails") return Response.json(await request.json());
      if (route === "GET /v1/emails") return Response.json(emails(url.searchParams.get("after")));
      if (route === "GET /v1/logs")
        return Response.json({ object: "list", data: [], has_more: false });
      if (route === "POST /api/cli/v1/token") {
        return Response.json({ api_key: KEY, api_key_id: "key_1", name: "coss CLI · smoke" });
      }
      return Response.json(
        { error: { type: "not_found_error", code: "not_found", message: route } },
        { status: 404 },
      );
    },
  });
  const home = await mkdtemp(join(tmpdir(), "coss-smoke-"));
  // A stub browser: records the URL it was asked to open.
  const opened = join(home, "opened.txt");
  const stubs = join(home, "stubs");
  await Bun.write(join(stubs, ".keep"), "");
  for (const name of ["xdg-open", "open"]) {
    await writeFile(join(stubs, name), `#!/bin/sh\nprintf '%s' "$1" > '${opened}'\n`);
    await chmod(join(stubs, name), 0o755);
  }
  const origin = `http://127.0.0.1:${server.port}`;
  const env: Record<string, string> = {
    PATH: `${stubs}${delimiter}${process.env.PATH ?? ""}`,
    HOME: home,
    USERPROFILE: home,
    XDG_CONFIG_HOME: join(home, "config"),
    APPDATA: join(home, "config"),
    COSS_BASE_URL: origin,
    COSS_DASHBOARD_URL: origin,
    NO_COLOR: "1",
  };
  // What a Windows process expects to find.
  for (const name of ["SYSTEMROOT", "TEMP", "TMP", "PATHEXT", "COMSPEC"]) {
    const value = process.env[name];
    if (value) env[name] = value;
  }

  async function coss(
    args: string[],
    options: { stdin?: string; env?: Record<string, string>; interruptWhen?: string } = {},
  ) {
    const child = Bun.spawn([resolve(binary), ...args], {
      env: { ...env, ...options.env },
      stdin: options.stdin === undefined ? "ignore" : "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
    if (options.stdin !== undefined && child.stdin) {
      child.stdin.write(options.stdin);
      await child.stdin.end();
    }
    const timer = setTimeout(() => child.kill("SIGKILL"), 30_000);
    let stderr = "";
    const errors = (async () => {
      for await (const chunk of child.stderr) {
        stderr += new TextDecoder().decode(chunk);
        if (options.interruptWhen && stderr.includes(options.interruptWhen)) child.kill("SIGINT");
      }
    })();
    const stdout = await new Response(child.stdout).text();
    await errors;
    const code = await child.exited;
    clearTimeout(timer);
    return { code, stdout, stderr };
  }

  function check(name: string, ok: boolean, detail: unknown): void {
    if (!ok) {
      console.error(`✖ ${name}`, detail);
      throw new Error(`smoke: ${name}`);
    }
    console.log(`✔ ${name}`);
  }

  try {
    const version = await coss(["--version"]);
    check("--version is package.json's", version.stdout.trim() === pkg.version, version);
    const help = await coss(["--help"]);
    check("--help", help.code === 0 && help.stdout.includes("Usage: coss <command>"), help);
    const completion = await coss(["completion", "bash"]);
    check("completion bash", completion.stdout.includes("coss __complete"), completion);
    const candidates = await coss(["__complete", "emails", "send", "--sim"]);
    check("__complete", candidates.stdout.trim() === "--simulate", candidates);

    const keyEnv = { COSS_API_KEY: KEY };
    const domains = await coss(["api", "domains"], { env: keyEnv });
    check("api GET", domains.code === 0 && JSON.parse(domains.stdout).object === "list", domains);
    const body = { from: "a@example.com", to: "b@example.com", subject: "Hi" };
    const sent = await coss(["api", "emails", "--input", "-", "--json"], {
      env: keyEnv,
      stdin: JSON.stringify(body),
    });
    check(
      "api --input - (stdin)",
      JSON.stringify(JSON.parse(sent.stdout)) === JSON.stringify(body),
      sent,
    );
    const pages = await coss(["api", "emails", "--paginate"], { env: keyEnv });
    const lines = pages.stdout.trimEnd().split("\n");
    check(
      `api --paginate: ${pages.stdout.length} bytes into a pipe, flushed before exit`,
      pages.code === 0 &&
        lines.length === 2 * PAGE &&
        JSON.parse(lines.at(-1) ?? "{}").id === "email_003999",
      { code: pages.code, lines: lines.length, stderr: pages.stderr },
    );

    const login = await coss(["login", "--manual"], { stdin: `${KEY}\n` });
    check("login --manual (piped key)", login.code === 0, login);
    const config = JSON.parse(
      await readFile(join(env.XDG_CONFIG_HOME ?? "", "coss", "config.json"), "utf8"),
    );
    check("config.json written", config.profiles.default.api_key === KEY, config);
    const whoami = await coss(["whoami", "--json"]);
    check(
      "whoami reads the profile",
      JSON.parse(whoami.stdout).environment.id === "env_smoke",
      whoami,
    );

    if (process.platform !== "win32") {
      const tail = await coss(["logs", "tail", "--interval", "500"], {
        env: keyEnv,
        interruptWhen: "Press Ctrl-C",
      });
      check("logs tail stops on Ctrl-C with 130", tail.code === 130, tail);

      // The browser sign-in: the stub browser records the URL; answer its loopback callback.
      const browser = coss(["login", "--profile", "browser"]);
      let url: URL | null = null;
      for (let i = 0; i < 200 && !url; i++) {
        await Bun.sleep(50);
        const text = await readFile(opened, "utf8").catch(() => "");
        if (text) url = new URL(text);
      }
      check("login opened the browser", url !== null, url);
      const port = url?.searchParams.get("port");
      const state = url?.searchParams.get("state");
      const callback = await fetch(
        `http://127.0.0.1:${port}/callback?code=smoke-code&state=${state}`,
      );
      check("loopback callback accepted", callback.status === 200, callback.status);
      const signedIn = await browser;
      check("login (browser) saved the profile", signedIn.code === 0, signedIn);
    }
  } finally {
    server.stop(true);
    await rm(home, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const binary = process.argv[2];
  if (!binary) {
    console.error("Usage: bun scripts/smoke-binary.ts <path to the coss executable>");
    process.exit(2);
  }
  await smoke(binary);
}
