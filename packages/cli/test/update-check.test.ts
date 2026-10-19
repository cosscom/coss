import { describe, expect, test } from "bun:test";
import { readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CliIo } from "../src/io.ts";
import { run } from "../src/run.ts";
import { checkForUpdate, isNewer, LATEST_URL, updateCheckAllowed } from "../src/update-check.ts";
import { VERSION } from "../src/version.ts";
import { environmentObject, fakeFetch, NOW, SANDBOX_KEY, testIo } from "./helpers.ts";

/** A terminal: stderr is a TTY. */
function terminalIo(overrides: Partial<CliIo> = {}) {
  const io = testIo(overrides);
  io.stderr.isTTY = true;
  return io;
}

function registry(version: string, onRequest?: () => void) {
  return fakeFetch({
    [`GET ${LATEST_URL}`]: () => {
      onRequest?.();
      return { name: "coss-cli", version };
    },
    // Slower than the check, so the notice is ready when the command ends.
    "GET /v1/environment": async () => {
      await Bun.sleep(30);
      return environmentObject();
    },
  });
}

describe("the update notice", () => {
  test("compares release versions only", () => {
    expect(isNewer("0.2.0", "0.1.9")).toBe(true);
    expect(isNewer("1.0.0", "0.99.99")).toBe(true);
    expect(isNewer("0.1.2", "0.1.2")).toBe(false);
    expect(isNewer("0.1.1", "0.1.2")).toBe(false);
    expect(isNewer("0.3.0-beta.1", "0.1.2")).toBe(false);
    expect(isNewer("0.3.0", "0.0.0-stage")).toBe(false);
  });

  test("only for a person at a terminal", () => {
    expect(updateCheckAllowed(terminalIo(), ["whoami"])).toBe(true);
    expect(updateCheckAllowed(testIo(), ["whoami"])).toBe(false);
    expect(updateCheckAllowed(terminalIo(), ["whoami", "--json"])).toBe(false);
    expect(updateCheckAllowed(terminalIo({ env: { CI: "true" } }), ["whoami"])).toBe(false);
    expect(updateCheckAllowed(terminalIo({ env: { CI: "false" } }), ["whoami"])).toBe(true);
    expect(updateCheckAllowed(terminalIo({ env: { COSS_NO_UPDATE_CHECK: "1" } }), ["x"])).toBe(
      false,
    );
  });

  test("asks the registry at most once a day, and caches the answer", async () => {
    let requests = 0;
    const api = registry("9.0.0", () => requests++);
    const io = terminalIo({ fetch: api.fetch });
    const notice = await checkForUpdate(io, "0.1.0");
    expect(notice).toBe("coss-cli 9.0.0 is available (this is 0.1.0): npm i -g coss-cli");
    const cachePath = join(io.configDir, "update-check.json");
    expect(JSON.parse(await readFile(cachePath, "utf8"))).toEqual({
      checked_at: NOW.toISOString(),
      latest: "9.0.0",
    });
    expect((await stat(cachePath)).mode & 0o777).toBe(0o600);
    expect(await checkForUpdate(io, "0.1.0")).toBe(notice);
    expect(requests).toBe(1);
    // The registry only says what exists; the request carries nothing but the URL.
    expect(api.requests[0]?.url.toString()).toBe(LATEST_URL);
    expect(api.requests[0]?.headers.has("authorization")).toBe(false);

    // A day later it asks again; a failed answer keeps the last one and waits another day.
    await writeFile(
      cachePath,
      JSON.stringify({ checked_at: "2026-10-14T11:00:00.000Z", latest: "9.0.0" }),
    );
    const offline = terminalIo({ fetch: async () => Promise.reject(new Error("offline")) });
    offline.configDir = io.configDir;
    expect(await checkForUpdate(offline, "0.1.0")).toBe(notice);
    expect(JSON.parse(await readFile(cachePath, "utf8")).checked_at).toBe(NOW.toISOString());
    expect(await checkForUpdate(io, "9.0.0")).toBeNull();
  });

  test("printed on stderr after a command, never with --json or for completion", async () => {
    const io = terminalIo({ fetch: registry("99.0.0").fetch, env: { COSS_API_KEY: SANDBOX_KEY } });
    expect(await run(["whoami"], io)).toBe(0);
    expect(io.errors()).toContain(`coss-cli 99.0.0 is available (this is ${VERSION})`);
    expect(io.output()).not.toContain("99.0.0");

    let requests = 0;
    const quiet = registry("99.0.0", () => requests++);
    for (const argv of [
      ["whoami", "--json"],
      ["completion", "zsh"],
      ["__complete", "who"],
      ["whoami", "--help"],
    ]) {
      const other = terminalIo({ fetch: quiet.fetch, env: { COSS_API_KEY: SANDBOX_KEY } });
      expect(await run(argv, other)).toBe(0);
      expect(other.errors()).not.toContain("is available");
    }
    expect(requests).toBe(0);
  });

  test("a check still running when the command ends is dropped", async () => {
    const io = terminalIo({
      fetch: fakeFetch({
        [`GET ${LATEST_URL}`]: () => new Promise(() => undefined),
        "GET /v1/environment": environmentObject(),
      }).fetch,
      env: { COSS_API_KEY: SANDBOX_KEY },
    });
    expect(await run(["whoami"], io)).toBe(0);
    expect(io.errors()).not.toContain("is available");
  });
});
