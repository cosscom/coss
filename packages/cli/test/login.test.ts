import { describe, expect, test } from "bun:test";
import { readConfig } from "../src/config.ts";
import { run } from "../src/run.ts";
import { apiError, environmentObject, fakeFetch, SANDBOX_KEY, testIo } from "./helpers.ts";

const NEW_KEY = `coss_test_${"n".repeat(64)}`;

function dashboardAndApi(onToken?: (body: unknown) => void) {
  return fakeFetch({
    "POST https://coss.com/api/cli/v1/token": ({ body }) => {
      onToken?.(body);
      return { api_key: NEW_KEY, api_key_id: "key_1", name: "coss CLI · test-host" };
    },
    "GET /v1/environment": ({ headers }) =>
      headers.get("authorization") === `Bearer ${NEW_KEY}` ||
      headers.get("authorization") === `Bearer ${SANDBOX_KEY}`
        ? environmentObject()
        : apiError(401, "authentication_error", "invalid_api_key"),
    "DELETE /v1/api_key": { object: "api_key", id: "key_old", deleted: true },
  });
}

describe("coss login", () => {
  test("in the browser: approval comes back to the loopback server, and a key is saved", async () => {
    let token: unknown;
    const api = dashboardAndApi((body) => {
      token = body;
    });
    let opened = "";
    const io = testIo({
      fetch: api.fetch,
      openBrowser: async (url) => {
        opened = url;
        const link = new URL(url);
        const callback = new URL(`http://127.0.0.1:${link.searchParams.get("port")}/callback`);
        // A stray request with another state is refused; the right one is accepted.
        expect((await fetch(`${callback}?code=x&state=wrong`)).status).toBe(400);
        callback.searchParams.set("code", "c".repeat(43));
        callback.searchParams.set("state", link.searchParams.get("state") ?? "");
        setTimeout(() => void fetch(callback), 0);
        return true;
      },
    });

    expect(await run(["login"], io)).toBe(0);
    const link = new URL(opened);
    expect(link.origin + link.pathname).toBe("https://coss.com/app/authorize/cli");
    expect(link.searchParams.get("host")).toBe("test-host");
    expect(link.searchParams.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(token).toEqual({
      code: "c".repeat(43),
      code_verifier: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
    });
    expect(io.errors()).toContain("Verification code: ");
    expect(io.output()).toContain("Signed in to Acme / Default / Development (sandbox).");

    const config = await readConfig(io);
    expect(config.default_profile).toBe("default");
    expect(config.profiles.default).toMatchObject({
      api_key: NEW_KEY,
      api_key_id: "key_1",
      login: "browser",
      environment: { id: "env_dev", mode: "sandbox" },
    });
  });

  test("over SSH (or --no-browser), the user pastes the code the page shows", async () => {
    let token: unknown;
    const api = dashboardAndApi((body) => {
      token = body;
    });
    const io = testIo({
      fetch: api.fetch,
      env: { SSH_CONNECTION: "1.2.3.4 22" },
      answers: ["the-code"],
    });
    expect(await run(["login"], io)).toBe(0);
    expect(io.errors()).toContain("/app/authorize/cli?");
    expect(io.errors()).toContain("mode=code");
    expect((token as { code: string }).code).toBe("the-code");
  });

  test("--manual takes an existing key, checked against the API", async () => {
    const api = dashboardAndApi();
    const bad = testIo({ fetch: api.fetch, answers: ["not-a-key"] });
    expect(await run(["login", "--manual"], bad)).toBe(1);
    expect(bad.errors()).toContain("isn't a coss.com API key");

    const io = testIo({
      fetch: api.fetch,
      answers: [SANDBOX_KEY],
      env: { COSS_BASE_URL: "http://localhost:3001" },
    });
    expect(await run(["login", "--manual", "--profile", "local"], io)).toBe(0);
    const config = await readConfig(io);
    expect(config.profiles.local).toMatchObject({
      api_key: SANDBOX_KEY,
      login: "manual",
      base_url: "http://localhost:3001",
    });
    expect(api.requests.some((r) => r.url.origin === "http://localhost:3001")).toBe(true);
  });

  test("logout revokes keys login created, and keeps pasted ones unless asked", async () => {
    const api = dashboardAndApi();
    const io = testIo({ fetch: api.fetch, answers: [SANDBOX_KEY] });
    expect(await run(["login", "--manual"], io)).toBe(0);
    expect(await run(["logout"], io)).toBe(0);
    expect(api.requests.filter((r) => r.method === "DELETE")).toHaveLength(0);
    expect((await readConfig(io)).profiles).toEqual({});
    expect(await run(["logout"], io)).toBe(1);

    const browser = testIo({
      fetch: api.fetch,
      env: { SSH_CONNECTION: "x" },
      answers: ["code"],
    });
    expect(await run(["login"], browser)).toBe(0);
    // The key is revoked where it was created, whatever COSS_BASE_URL says now.
    browser.env.COSS_BASE_URL = "http://localhost:3001";
    expect(await run(["logout"], browser)).toBe(0);
    const deletes = api.requests.filter((r) => r.method === "DELETE");
    expect(deletes.map((r) => r.url.origin)).toEqual(["https://api.coss.com"]);
    expect(browser.output()).toContain("(key revoked)");
  });

  test("whoami names the environment and where the key comes from", async () => {
    const api = dashboardAndApi();
    const io = testIo({ fetch: api.fetch, env: { COSS_API_KEY: SANDBOX_KEY } });
    expect(await run(["whoami"], io)).toBe(0);
    expect(io.output()).toContain("Acme / Default / Development (sandbox)");
    expect(io.output()).toContain("COSS_API_KEY");
    const json = testIo({ fetch: api.fetch, env: { COSS_API_KEY: SANDBOX_KEY } });
    expect(await run(["whoami", "--json"], json)).toBe(0);
    expect(JSON.parse(json.output())).toMatchObject({
      source: "COSS_API_KEY",
      environment: { id: "env_dev" },
    });
  });
});
