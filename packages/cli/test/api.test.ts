import { describe, expect, test } from "bun:test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { API_VERSION } from "coss";
import { apiPath } from "../src/commands/api.ts";
import { run } from "../src/run.ts";
import { apiError, fakeFetch, SANDBOX_KEY, testIo } from "./helpers.ts";

const env = { COSS_API_KEY: SANDBOX_KEY, COSS_BASE_URL: "https://api.coss.test" };

describe("coss api", () => {
  test("paths are relative to /v1; URLs are refused", () => {
    expect(apiPath("domains")).toBe("/v1/domains");
    expect(apiPath("/domains/dom_1")).toBe("/v1/domains/dom_1");
    expect(apiPath("v1/emails?limit=5")).toBe("/v1/emails?limit=5");
    expect(apiPath("/v1/emails")).toBe("/v1/emails");
    for (const path of [
      "https://evil.test/v1/domains",
      "//evil.test/v1",
      "localhost:3001/v1",
      "/v1/",
    ]) {
      expect(() => apiPath(path)).toThrow();
    }
  });

  test("GET prints the response's JSON; fields are query parameters", async () => {
    const domains = { object: "list", data: [{ id: "dom_1" }], has_more: false };
    const api = fakeFetch({ "GET /v1/domains": domains });
    const io = testIo({ fetch: api.fetch, env });
    expect(
      await run(["api", "domains?limit=5", "-f", "status=verified", "-F", "name[]=a,b"], io),
    ).toBe(0);
    expect(JSON.parse(io.output())).toEqual(domains);
    expect(io.output()).toContain('\n  "object": "list"');
    const request = api.requests[0];
    expect(request?.url.origin).toBe("https://api.coss.test");
    expect([...(request?.url.searchParams ?? [])]).toEqual([
      ["limit", "5"],
      ["status", "verified"],
      ["name", "a,b"],
    ]);
    expect(request?.headers.get("coss-version")).toBe(API_VERSION);

    const compact = testIo({ fetch: api.fetch, env });
    expect(await run(["api", "domains", "--json", "--api-version", "2026-10-01"], compact)).toBe(0);
    expect(compact.output()).toBe(`${JSON.stringify(domains)}\n`);
    expect(api.requests[1]?.headers.get("coss-version")).toBe("2026-10-01");
  });

  test("other methods send fields as a typed JSON body", async () => {
    const api = fakeFetch({
      "POST /v1/webhook_endpoints": { object: "webhook_endpoint", id: "we_1" },
    });
    const io = testIo({ fetch: api.fetch, env });
    const description = join(io.configDir, "description.txt");
    await writeFile(description, "From a file");
    const code = await run(
      [
        "api",
        "-X",
        "post",
        "webhook_endpoints",
        "-f",
        "url=https://example.com/hooks",
        "-F",
        "event_types[]=email.delivered",
        "-F",
        "event_types[]=email.bounced",
        "-F",
        "enabled=true",
        "-F",
        "rate_limit=10",
        "-f",
        "version=10",
        "-F",
        `description=@${description}`,
      ],
      io,
    );
    expect(code).toBe(0);
    expect(api.requests[0]?.method).toBe("POST");
    expect(api.requests[0]?.body).toEqual({
      url: "https://example.com/hooks",
      version: "10",
      event_types: ["email.delivered", "email.bounced"],
      enabled: true,
      rate_limit: 10,
      description: "From a file",
    });
    expect(api.requests[0]?.headers.get("idempotency-key")).toBeTruthy();
  });

  test("--input is the body (from a file or stdin), and makes the default method POST", async () => {
    const api = fakeFetch({
      "POST /v1/emails": { object: "email", id: "email_1" },
      "PATCH /v1/email_templates/tmpl_1": { object: "email_template", id: "tmpl_1" },
    });
    const io = testIo({ fetch: api.fetch, env });
    const file = join(io.configDir, "email.json");
    await writeFile(file, JSON.stringify({ to: "a@example.com", subject: "Hi" }));
    expect(await run(["api", "emails", "--input", file, "-f", "dry=1"], io)).toBe(0);
    expect(api.requests[0]?.body).toEqual({ to: "a@example.com", subject: "Hi" });
    expect(api.requests[0]?.url.searchParams.get("dry")).toBe("1");

    const piped = testIo({ fetch: api.fetch, env, answers: ['{"name":"Welcome"}'] });
    expect(await run(["api", "-X", "PATCH", "email_templates/tmpl_1", "--input", "-"], piped)).toBe(
      0,
    );
    expect(api.requests[1]?.body).toEqual({ name: "Welcome" });

    const invalid = testIo({ fetch: api.fetch, env, answers: ["not json"] });
    expect(await run(["api", "emails", "--input", "-"], invalid)).toBe(2);
    expect(invalid.errors()).toContain("--input takes JSON");
  });

  test("--paginate prints every item of every page, one per line", async () => {
    const api = fakeFetch({
      "GET /v1/emails": (request: { url: URL }) =>
        request.url.searchParams.get("after") === "email_2"
          ? { object: "list", data: [{ id: "email_3" }], has_more: false }
          : { object: "list", data: [{ id: "email_1" }, { id: "email_2" }], has_more: true },
    });
    const io = testIo({ fetch: api.fetch, env });
    expect(await run(["api", "emails", "--paginate", "-f", "limit=2"], io)).toBe(0);
    expect(
      io
        .output()
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line)),
    ).toEqual([{ id: "email_1" }, { id: "email_2" }, { id: "email_3" }]);
    expect(api.requests.map((request) => request.url.search)).toEqual([
      "?limit=2",
      "?limit=2&after=email_2",
    ]);

    const notList = testIo({
      fetch: fakeFetch({ "GET /v1/environment": { object: "environment" } }).fetch,
      env,
    });
    expect(await run(["api", "environment", "--paginate"], notList)).toBe(1);
    expect(notList.errors()).toContain("isn't a list");
    expect(await run(["api", "-X", "POST", "emails", "--paginate"], testIo({ env }))).toBe(2);
  });

  test("a failed call prints the error as JSON and exits with 1", async () => {
    const api = fakeFetch({
      "GET /v1/domains/dom_x": () =>
        apiError(404, "not_found_error", "not_found", "No such domain."),
    });
    const io = testIo({ fetch: api.fetch, env });
    expect(await run(["api", "domains/dom_x", "--json"], io)).toBe(1);
    expect(JSON.parse(io.output())).toMatchObject({
      error: { type: "not_found_error", code: "not_found", status: 404, request_id: "req_test" },
    });
    expect(io.errors()).toContain("GET /v1/domains/dom_x: No such domain. (request req_test)");
  });

  test("--raw prints a body that isn't JSON as it is", async () => {
    const csv = "email,status\na@example.com,subscribed\n";
    const api = fakeFetch({
      "GET /v1/contacts/export": () =>
        new Response(csv, { headers: { "content-type": "text/csv" } }),
    });
    const raw = testIo({ fetch: api.fetch, env });
    expect(await run(["api", "contacts/export", "--raw"], raw)).toBe(0);
    expect(raw.output()).toBe(csv);

    const parsed = testIo({ fetch: api.fetch, env });
    expect(await run(["api", "contacts/export"], parsed)).toBe(1);
    expect(parsed.errors()).toContain("Add --raw");
  });

  test("usage errors", async () => {
    const cases: [string[], string][] = [
      [["api"], "Pass a path"],
      [["api", "domains", "emails"], "takes one path"],
      [["api", "-X", "HEAD", "domains"], "--method takes"],
      [["api", "-X", "POST", "domains", "-f", "=x"], "takes name=value"],
      [["api", "domains", "--api-version", "latest"], "--api-version takes a date"],
    ];
    for (const [argv, message] of cases) {
      const io = testIo({ env });
      expect(await run(argv, io)).toBe(2);
      expect(io.errors()).toContain(message);
    }
  });
});
