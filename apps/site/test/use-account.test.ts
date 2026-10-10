import { afterEach, expect, test } from "bun:test";
import { loadAccount } from "../src/lib/use-account";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Answers Better Auth's endpoints with the given JSON bodies (`undefined` → 404). */
function mockAuth(routes: Record<string, unknown>) {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const body = routes[String(input)];
    return body === undefined ? new Response("not found", { status: 404 }) : Response.json(body);
  }) as typeof fetch;
}

test("signed in: links to the first organization by name, like the dashboard does", async () => {
  mockAuth({
    "/api/auth/get-session": { user: { name: "Ada" }, session: {} },
    "/api/auth/organization/list": [
      { name: "Zeta", slug: "zeta" },
      { name: "Acme", slug: "acme" },
    ],
  });
  expect(await loadAccount()).toEqual({ status: "signed-in", name: "Ada", dashboardPath: "/acme" });
});

test("signed in without an organization: onboarding", async () => {
  mockAuth({
    "/api/auth/get-session": { user: { name: "Ada" } },
    "/api/auth/organization/list": [],
  });
  expect(await loadAccount()).toMatchObject({ dashboardPath: "/onboarding" });
});

test("no session, or no auth endpoint at all: signed out", async () => {
  mockAuth({ "/api/auth/get-session": null });
  expect(await loadAccount()).toEqual({ status: "signed-out" });
  mockAuth({});
  expect(await loadAccount()).toEqual({ status: "signed-out" });
});
