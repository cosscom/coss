import { describe, expect, test } from "bun:test";
import { run } from "../src/run.ts";
import { fakeFetch, SANDBOX_KEY, testIo } from "./helpers.ts";

const env = { COSS_API_KEY: SANDBOX_KEY };

const form = {
  object: "form",
  id: "form_1",
  name: "Contact",
  enabled: true,
  endpoint: "https://forms.coss.test/f/form_1",
  hosted_url: null,
  disabled_by_admin: false,
};

const submission = {
  object: "form_submission",
  id: "fsub_1",
  form_id: "form_1",
  status: "held",
  data: { email: "ada@example.com", message: "Hello\u001b[31m" },
  submitter_email: "ada@example.com",
  files: [],
  created_at: "2026-10-29T10:00:00.000Z",
};

const list = (data: unknown[], has_more = false) => ({ object: "list", data, has_more });

describe("coss forms", () => {
  test("list prints each form's endpoint", async () => {
    const api = fakeFetch({ "GET /v1/forms": list([form]) });
    const io = testIo({ fetch: api.fetch, env });
    expect(await run(["forms", "list"], io)).toBe(0);
    expect(io.output()).toContain("https://forms.coss.test/f/form_1");
    expect(io.output()).toContain("Contact");
  });

  test("submissions filters by status and never prints escape sequences", async () => {
    const api = fakeFetch({ "GET /v1/forms/form_1/submissions": list([submission], true) });
    const io = testIo({ fetch: api.fetch, env });
    expect(await run(["forms", "submissions", "form_1", "--status", "held"], io)).toBe(0);
    expect(api.requests[0]?.url.searchParams.get("status")).toBe("held");
    expect(io.output()).toContain("fsub_1");
    expect(io.output()).toContain("ada@example.com");
    expect(io.output()).not.toContain("\u001b[31m");
    expect(io.errors()).toContain("--paginate");
  });

  test("--json prints one submission per line; a bad status is a usage error", async () => {
    const api = fakeFetch({ "GET /v1/forms/form_1/submissions": list([submission]) });
    const io = testIo({ fetch: api.fetch, env });
    expect(await run(["forms", "submissions", "form_1", "--json"], io)).toBe(0);
    expect(JSON.parse(io.output().trim())).toMatchObject({ id: "fsub_1" });
    const bad = testIo({ fetch: api.fetch, env });
    expect(await run(["forms", "submissions", "form_1", "--status", "nope"], bad)).toBe(2);
    expect(await run(["forms", "submissions"], bad)).toBe(2);
  });
});
