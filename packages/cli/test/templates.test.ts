import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Fetch } from "../src/io.ts";
import { run } from "../src/run.ts";
import { SANDBOX_KEY, testIo } from "./helpers.ts";

const env = { COSS_API_KEY: SANDBOX_KEY };

type Draft = {
  revision: number;
  default_locale: string;
  variables: unknown[];
  sample_variables: Record<string, unknown>;
  contents: { locale: string; subject: string; html: string | null; text: string | null }[];
};
type Stored = {
  id: string;
  alias: string | null;
  name: string;
  description: string | null;
  published_version: number | null;
  draft: Draft;
  problems: object[];
};

/** The templates API, in memory: enough of it for pull, push, publish and render. */
function templatesApi(initial: Stored[] = []) {
  const templates = new Map(initial.map((template) => [template.id, template]));
  const calls: string[] = [];
  let next = initial.length + 1;
  const find = (ref: string) =>
    templates.get(ref) ?? [...templates.values()].find((template) => template.alias === ref);
  const object = (t: Stored) => ({
    object: "email_template",
    id: t.id,
    alias: t.alias,
    name: t.name,
    description: t.description,
    published_version: t.published_version,
    published_at: null,
    has_unpublished_changes: false,
    created_at: "2026-10-15T12:00:00.000Z",
    updated_at: "2026-10-15T12:00:00.000Z",
  });
  const version = (t: Stored, number: number | null) => ({
    object: "email_template_version",
    template_id: t.id,
    version: number,
    ...t.draft,
    problems: number === null ? t.problems : [],
    published_at: null,
    created_at: "2026-10-15T12:00:00.000Z",
    updated_at: "2026-10-15T12:00:00.000Z",
  });
  const notFound = () =>
    Response.json(
      {
        error: {
          type: "not_found_error",
          code: "not_found",
          message: "Not found.",
          request_id: "req_t",
        },
      },
      { status: 404 },
    );
  const fetch: Fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? "GET";
    const body = typeof init.body === "string" ? JSON.parse(init.body) : null;
    calls.push(`${method} ${url.pathname}`);
    const [, , , ref, action, number] = url.pathname.split("/");
    if (url.pathname === "/v1/email_templates") {
      if (method === "GET") {
        return Response.json({
          object: "list",
          data: [...templates.values()].map(object),
          has_more: false,
        });
      }
      const id = `etpl_${next++}`;
      const created: Stored = {
        id,
        alias: body.alias ?? null,
        name: body.name,
        description: body.description ?? null,
        published_version: null,
        draft: {
          revision: 1,
          default_locale: body.default_locale ?? body.contents?.[0]?.locale ?? "en",
          variables: body.variables ?? [],
          sample_variables: body.sample_variables ?? {},
          contents: body.contents ?? [],
        },
        problems: [],
      };
      templates.set(id, created);
      return Response.json(object(created));
    }
    const template = ref ? find(decodeURIComponent(ref)) : undefined;
    if (!template) return notFound();
    if (action === undefined) {
      if (method === "PATCH") Object.assign(template, body);
      return Response.json(object(template));
    }
    if (action === "draft" && method === "GET") return Response.json(version(template, null));
    if (action === "draft" && method === "PUT") {
      const { revision, ...draft } = body;
      expect(revision).toBe(template.draft.revision);
      template.draft = { ...draft, revision: template.draft.revision + 1 };
      return Response.json(version(template, null));
    }
    if (action === "publish") {
      template.published_version = (template.published_version ?? 0) + 1;
      return Response.json(version(template, template.published_version));
    }
    if (action === "versions" && number) return Response.json(version(template, Number(number)));
    if (action === "render") {
      const values = body.variables ?? template.draft.sample_variables;
      const content = template.draft.contents[0];
      const fill = (source: string | null | undefined) =>
        source ? source.replace(/\{\{(\w+)\}\}/g, (_, name) => String(values[name] ?? "")) : null;
      return Response.json({
        object: "email_template_render",
        template_id: template.id,
        version: body.version ?? null,
        locale: body.locale ?? content?.locale ?? "en",
        subject: fill(content?.subject),
        html: fill(content?.html),
        text: fill(content?.text),
      });
    }
    return notFound();
  };
  return { fetch, templates, calls };
}

const WELCOME: Stored = {
  id: "etpl_1",
  alias: "welcome",
  name: "Welcome",
  description: null,
  published_version: 1,
  draft: {
    revision: 3,
    default_locale: "en",
    variables: [{ name: "first_name", type: "string", required: true }],
    sample_variables: { first_name: "Ada" },
    contents: [
      {
        locale: "en",
        subject: "Welcome, {{first_name}}",
        html: "<p>Hi {{first_name}}</p>\n",
        text: null,
      },
      {
        locale: "de",
        subject: "Willkommen, {{first_name}}",
        html: null,
        text: "Hallo {{first_name}}",
      },
    ],
  },
  problems: [],
};

describe("coss templates", () => {
  test("pull writes a folder per template; push of unchanged files saves nothing", async () => {
    const api = templatesApi([structuredClone(WELCOME)]);
    const io = testIo({ fetch: api.fetch, env });
    const dir = join(io.configDir, "templates");
    expect(await run(["templates", "pull", "--dir", dir], io)).toBe(0);
    const folder = join(dir, "welcome");
    expect(readdirSync(folder).sort()).toEqual([
      "de.subject.txt",
      "de.txt",
      "en.html",
      "en.subject.txt",
      "template.json",
    ]);
    expect(readFileSync(join(folder, "en.subject.txt"), "utf8")).toBe("Welcome, {{first_name}}\n");
    expect(readFileSync(join(folder, "en.html"), "utf8")).toBe("<p>Hi {{first_name}}</p>\n");
    expect(JSON.parse(readFileSync(join(folder, "template.json"), "utf8"))).toMatchObject({
      id: "etpl_1",
      alias: "welcome",
      default_locale: "en",
      sample_variables: { first_name: "Ada" },
    });

    const again = testIo({ fetch: api.fetch, env });
    expect(await run(["templates", "push", "--dir", dir], again)).toBe(0);
    expect(again.output()).toContain("welcome: unchanged");
    expect(api.calls.filter((call) => call.startsWith("PUT"))).toEqual([]);
  });

  test("push saves edited files as the draft, shows problems by file, and --publish publishes", async () => {
    const api = templatesApi([structuredClone(WELCOME)]);
    const io = testIo({ fetch: api.fetch, env });
    const dir = join(io.configDir, "templates");
    expect(await run(["templates", "pull", "--dir", dir], io)).toBe(0);
    await writeFile(join(dir, "welcome", "en.html"), "<p>Hello {{first_name}}</p>");
    await writeFile(join(dir, "welcome", "fr.subject.txt"), "Bienvenue\n");
    await writeFile(join(dir, "welcome", "fr.txt"), "Bonjour");
    const stored = api.templates.get("etpl_1");
    if (!stored) throw new Error("missing");
    stored.problems = [
      { locale: "fr", field: "text", message: "Unclosed {{#if}}.", line: 1, column: 3 },
    ];

    const push = testIo({ fetch: api.fetch, env });
    expect(await run(["templates", "push", join(dir, "welcome")], push)).toBe(0);
    expect(push.output()).toContain("welcome: draft saved (revision 4)");
    expect(push.errors()).toContain(`${join(dir, "welcome", "fr.txt")}:1:3 Unclosed {{#if}}.`);
    expect(stored.draft.contents).toEqual([
      {
        locale: "en",
        subject: "Welcome, {{first_name}}",
        html: "<p>Hello {{first_name}}</p>",
        text: null,
      },
      {
        locale: "de",
        subject: "Willkommen, {{first_name}}",
        html: null,
        text: "Hallo {{first_name}}",
      },
      { locale: "fr", subject: "Bienvenue", html: null, text: "Bonjour" },
    ]);

    const publish = testIo({ fetch: api.fetch, env });
    expect(await run(["templates", "push", "--dir", dir, "--publish"], publish)).toBe(1);
    expect(publish.errors()).toContain("not published, the draft has problems");
    stored.problems = [];
    const fixed = testIo({ fetch: api.fetch, env });
    expect(await run(["templates", "push", "--dir", dir, "--publish"], fixed)).toBe(0);
    expect(fixed.output()).toContain("welcome: published version 2");

    // --json: stdout is only the result objects, one per line.
    const json = testIo({ fetch: api.fetch, env });
    expect(await run(["templates", "push", "--dir", dir, "--publish", "--json"], json)).toBe(0);
    const results = json
      .output()
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(results).toEqual([expect.objectContaining({ published_version: 3 })]);
  });

  test("push creates templates that don't exist yet, by alias or remembering the new id", async () => {
    const api = templatesApi();
    const io = testIo({ fetch: api.fetch, env });
    const dir = join(io.configDir, "templates");
    await mkdir(join(dir, "receipt"), { recursive: true });
    await writeFile(
      join(dir, "receipt", "template.json"),
      JSON.stringify({ name: "Receipt", alias: "receipt" }),
    );
    await writeFile(join(dir, "receipt", "en.subject.txt"), "Your receipt");
    await writeFile(join(dir, "receipt", "en.txt"), "Thanks!");
    await mkdir(join(dir, "plain"), { recursive: true });
    await writeFile(join(dir, "plain", "template.json"), JSON.stringify({ name: "Plain" }));
    await writeFile(join(dir, "plain", "en.subject.txt"), "Hi");
    await writeFile(join(dir, "plain", "en.txt"), "Hi");

    expect(await run(["templates", "push", "--dir", dir], io)).toBe(0);
    expect(io.output()).toContain("Plain: created etpl_1");
    expect(io.output()).toContain("receipt: created etpl_2");
    expect(JSON.parse(readFileSync(join(dir, "plain", "template.json"), "utf8")).id).toBe("etpl_1");
    expect(api.templates.get("etpl_2")?.draft.contents).toEqual([
      { locale: "en", subject: "Your receipt", html: null, text: "Thanks!" },
    ]);

    // Pushed again: found by alias and by the remembered id, nothing created twice.
    const again = testIo({ fetch: api.fetch, env });
    expect(await run(["templates", "push", "--dir", dir], again)).toBe(0);
    expect(api.templates.size).toBe(2);

    // An id from another environment without an alias can't be found here.
    await writeFile(
      join(dir, "plain", "template.json"),
      JSON.stringify({ id: "etpl_9", name: "Plain" }),
    );
    const lost = testIo({ fetch: api.fetch, env });
    expect(await run(["templates", "push", join(dir, "plain")], lost)).toBe(1);
    expect(lost.errors()).toContain('Give it an "alias"');
  });

  test("push --watch pushes a template again when its files change, until Ctrl-C", async () => {
    const api = templatesApi([structuredClone(WELCOME)]);
    const watchers: ((file: string) => void)[] = [];
    const io = testIo({
      fetch: api.fetch,
      env,
      watch: (_dir, _signal, onChange) => {
        watchers.push(onChange);
      },
    });
    const dir = join(io.configDir, "templates");
    expect(
      await run(
        ["templates", "pull", "--dir", dir],
        testIo({ fetch: api.fetch, env, configDir: io.configDir }),
      ),
    ).toBe(0);

    const watching = run(["templates", "push", "--dir", dir, "--watch"], io);
    for (let i = 0; i < 100 && watchers.length === 0; i++) await Bun.sleep(5);
    await writeFile(join(dir, "welcome", "en.html"), "<p>Changed</p>");
    watchers[0]?.("en.html");
    watchers[0]?.("en.html");
    watchers[0]?.(".en.html.swp");
    for (let i = 0; i < 200 && !io.output().includes("draft saved"); i++) await Bun.sleep(5);
    io.controller.abort();
    expect(await watching).toBe(130);
    expect(io.output()).toContain("welcome: unchanged");
    expect(io.output().split("draft saved").length - 1).toBe(1);
    expect(api.templates.get("etpl_1")?.draft.contents[0]?.html).toBe("<p>Changed</p>");
  });

  test("preview renders with sample values plus --var, and saves or opens the HTML", async () => {
    const api = templatesApi([structuredClone(WELCOME)]);
    const opened: string[] = [];
    const io = testIo({
      fetch: api.fetch,
      env,
      openBrowser: async (url) => {
        opened.push(url);
        return true;
      },
    });
    expect(await run(["templates", "preview", "welcome"], io)).toBe(0);
    expect(io.output()).toContain("Subject  Welcome, Ada");
    expect(io.output()).toContain("(no text part)");
    expect(io.errors()).toContain("--open shows it in your browser");

    const file = join(io.configDir, "preview.html");
    const saved = testIo({ fetch: api.fetch, env });
    expect(
      await run(
        ["templates", "preview", "welcome", "--var", "first_name=Grace", "--output", file],
        saved,
      ),
    ).toBe(0);
    expect(saved.output()).toContain("Subject  Welcome, Grace");
    expect(readFileSync(file, "utf8")).toBe("<p>Hi Grace</p>\n");

    const open = testIo({ fetch: api.fetch, env, openBrowser: io.openBrowser });
    expect(await run(["templates", "preview", "welcome", "--open", "--json"], open)).toBe(0);
    expect(JSON.parse(open.output())).toMatchObject({ subject: "Welcome, Ada", version: null });
    expect(opened[0]).toStartWith("file://");
    expect(existsSync(new URL(opened[0] ?? "").pathname)).toBe(true);

    // A folder previews its template's draft, and says when the files differ from it.
    const dir = join(io.configDir, "templates");
    expect(await run(["templates", "pull", "--dir", dir], testIo({ fetch: api.fetch, env }))).toBe(
      0,
    );
    await writeFile(join(dir, "welcome", "en.html"), "<p>Not pushed</p>");
    const local = testIo({ fetch: api.fetch, env });
    expect(await run(["templates", "preview", join(dir, "welcome")], local)).toBe(0);
    expect(local.errors()).toContain("differs from the draft");
  });

  test("list", async () => {
    const api = templatesApi([structuredClone(WELCOME)]);
    const io = testIo({ fetch: api.fetch, env });
    expect(await run(["templates", "list"], io)).toBe(0);
    expect(io.output()).toMatch(/welcome\s+Welcome\s+v1\s+etpl_1/);
  });
});
