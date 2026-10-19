import { stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import type { Coss, EmailTemplate, EmailTemplateVersion, TemplateProblem } from "coss";
import { type Flags, jsonOrString, pairs } from "../args.ts";
import { type Command, type CommandInput, defineCommand } from "../command.ts";
import { type Context, clientFor, resolveCredentials } from "../context.ts";
import { apiError, CliError, UsageError } from "../errors.ts";
import type { Output } from "../output.ts";
import { type Cell, table } from "../table.ts";
import {
  draftOf,
  fileName,
  folderName,
  isTemplateFile,
  type LocalTemplate,
  readTemplate,
  rememberId,
  sameDraft,
  templateDirs,
  writeTemplate,
} from "../templates/files.ts";

const DEFAULT_DIR = "templates";
/** Edits arrive as bursts of events (save, rename, chmod): push once they settle. */
const WATCH_DEBOUNCE_MS = 300;

async function client(context: Context): Promise<Coss> {
  return clientFor(context.io, await resolveCredentials(context));
}

/** Every template of the environment, oldest page first. */
async function allTemplates(coss: Coss, signal: AbortSignal): Promise<EmailTemplate[]> {
  const templates: EmailTemplate[] = [];
  let after: string | undefined;
  for (;;) {
    const { data, error } = await coss.email.templates.list(
      { limit: 100, ...(after && { after }) },
      { signal },
    );
    if (error) throw apiError("Couldn't list the templates", error);
    templates.push(...data.data);
    const last = data.data.at(-1);
    if (!data.has_more || !last) return templates;
    after = last.id;
  }
}

async function getTemplate(coss: Coss, ref: string): Promise<EmailTemplate | null> {
  const { data, error } = await coss.email.templates.get(ref);
  if (error?.type === "not_found_error") return null;
  if (error) throw apiError(`Couldn't read the template ${ref}`, error);
  return data;
}

async function getDraft(coss: Coss, ref: string): Promise<EmailTemplateVersion> {
  const { data, error } = await coss.email.templates.getDraft(ref);
  if (error) throw apiError(`Couldn't read the draft of ${ref}`, error);
  return data;
}

async function isDir(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

// ---- list

export const templatesListCommand: Command = defineCommand({
  name: "templates list",
  summary: "List the environment's email templates",
  description: "Lists the environment's email templates: alias, name, published version and id.",
  flags: { json: { type: "boolean", description: "One template object per line" } },
  run: async ({ context }) => {
    const { out, io } = context;
    const templates = await allTemplates(await client(context), io.signal);
    if (out.json) {
      for (const template of templates) out.data(template);
      return 0;
    }
    if (templates.length === 0) {
      out.info(
        "No templates yet. Create one in the dashboard, or push a folder with `coss templates push`.",
      );
      return 0;
    }
    const rows: Cell[][] = [
      ["ALIAS", "NAME", "PUBLISHED", "ID"].map((text) => ({ text, style: "dim" as const })),
      ...templates.map((template): Cell[] => [
        template.alias ?? { text: "-", style: "dim" },
        template.name,
        template.published_version === null
          ? { text: "never", style: "yellow" }
          : `v${template.published_version}${template.has_unpublished_changes ? " (draft changed)" : ""}`,
        { text: template.id, style: "dim" },
      ]),
    ];
    for (const line of table(rows, out)) out.line(line);
    return 0;
  },
});

// ---- pull

const PULL_FLAGS = {
  dir: {
    type: "string",
    value: "<dir>",
    description: `Where to write the template folders (default: ${DEFAULT_DIR})`,
  },
  json: { type: "boolean", description: "One line per template written" },
} as const satisfies Flags;

export const templatesPullCommand: Command = defineCommand({
  name: "templates pull",
  summary: "Write templates' drafts to files",
  usage: "[<id|alias>...] [options]",
  description:
    "Writes each template's draft (every template's without arguments) to a folder named by " +
    "its alias (else its id): template.json holds its name, alias, variables and sample values, " +
    "and each locale has <locale>.subject.txt, <locale>.html and <locale>.txt. Existing files " +
    "are overwritten; files of locales the draft no longer has are removed.",
  flags: PULL_FLAGS,
  positionals: true,
  run: async ({ values, positionals, context }: CommandInput<typeof PULL_FLAGS>) => {
    const { out, io } = context;
    const coss = await client(context);
    const root = values.dir ?? DEFAULT_DIR;
    const templates =
      positionals.length > 0
        ? await Promise.all(
            positionals.map(async (ref) => {
              const template = await getTemplate(coss, ref);
              if (!template) throw new CliError(`No template "${ref}" in this environment.`);
              return template;
            }),
          )
        : await allTemplates(coss, io.signal);
    if (templates.length === 0) {
      out.info("No templates in this environment.");
      return 0;
    }
    for (const template of templates) {
      const draft = await getDraft(coss, template.id);
      const dir = join(root, folderName(template));
      await writeTemplate(dir, template, draft);
      if (out.json)
        out.data({ id: template.id, alias: template.alias, dir, revision: draft.revision });
      else {
        out.line(
          `${out.style("green", "✔")} ${template.alias ?? template.name} → ${dir} ${out.style("dim", `(${draft.contents.map((content) => content.locale).join(", ") || "no content"})`)}`,
        );
      }
    }
    return 0;
  },
});

// ---- push

function problemLines(out: Output, local: LocalTemplate, problems: TemplateProblem[]): string[] {
  return problems.map((problem) => {
    const file = join(local.dir, fileName(problem.locale, problem.field));
    return `  ${out.style("yellow", `${file}:${problem.line}:${problem.column}`)} ${problem.message}`;
  });
}

type PushResult = {
  dir: string;
  template_id: string;
  /** Whether the draft was saved (or created): `false` when the files changed nothing. */
  saved: boolean;
  revision: number;
  published_version: number | null;
};

/**
 * Pushes one folder: finds the template by alias (so a folder pushes to every environment), else
 * by id, creating it when neither exists; then saves the draft if the files change it.
 */
async function pushTemplate(
  coss: Coss,
  out: Output,
  dir: string,
  options: { publish: boolean },
): Promise<PushResult> {
  const local = await readTemplate(dir);
  const { manifest } = local;
  const draft = draftOf(local);
  const label = manifest.alias ?? manifest.name;
  let template =
    (manifest.alias ? await getTemplate(coss, manifest.alias) : null) ??
    (manifest.id ? await getTemplate(coss, manifest.id) : null);

  if (!template && manifest.id && !manifest.alias) {
    throw new CliError(
      `${dir}: no template ${manifest.id} in this environment. Give it an "alias" in template.json to push it to other environments.`,
    );
  }
  let saved: EmailTemplateVersion;
  let changed = true;
  if (!template) {
    const { data, error } = await coss.email.templates.create({
      name: manifest.name,
      ...(manifest.alias && { alias: manifest.alias }),
      ...(manifest.description && { description: manifest.description }),
      ...draft,
    });
    if (error) throw apiError(`${dir}: couldn't create the template`, error);
    template = data;
    if (!manifest.alias) await rememberId(dir, data.id);
    saved = await getDraft(coss, data.id);
    out.line(`${out.style("green", "✔")} ${label}: created ${out.style("dim", data.id)}`);
  } else {
    const changes = {
      ...(template.name !== manifest.name && { name: manifest.name }),
      ...(manifest.alias !== undefined &&
        template.alias !== manifest.alias && { alias: manifest.alias }),
      ...(manifest.description !== undefined &&
        template.description !== manifest.description && { description: manifest.description }),
    };
    if (Object.keys(changes).length > 0) {
      const { error } = await coss.email.templates.update(template.id, changes);
      if (error) throw apiError(`${dir}: couldn't update the template`, error);
    }
    const remote = await getDraft(coss, template.id);
    if (sameDraft(draft, remote)) {
      saved = remote;
      changed = false;
      if (!options.publish) out.line(`${label}: ${out.style("dim", "unchanged")}`);
    } else {
      const { data, error } = await coss.email.templates.updateDraft(template.id, {
        revision: remote.revision,
        ...draft,
      });
      if (error) throw apiError(`${dir}: couldn't save the draft`, error);
      saved = data;
      out.line(
        `${out.style("green", "✔")} ${label}: draft saved ${out.style("dim", `(revision ${data.revision})`)}`,
      );
    }
  }
  for (const line of problemLines(out, local, saved.problems)) out.warn(line.trimStart());

  let published: number | null = template.published_version;
  if (options.publish) {
    if (saved.problems.length > 0) {
      throw new CliError(`${dir}: not published, the draft has problems (above).`);
    }
    const { data, error } = await coss.email.templates.publish(template.id, {
      revision: saved.revision,
    });
    if (error) throw apiError(`${dir}: couldn't publish`, error);
    published = data.version;
    out.line(`${out.style("green", "✔")} ${label}: published version ${data.version}`);
  }
  return {
    dir,
    template_id: template.id,
    saved: changed,
    revision: saved.revision,
    published_version: published,
  };
}

const PUSH_FLAGS = {
  publish: { type: "boolean", description: "Publish each draft after saving it" },
  watch: {
    type: "boolean",
    description: "Keep running and push a template's draft again whenever its files change",
  },
  dir: {
    type: "string",
    value: "<dir>",
    description: `The folder of template folders, without arguments (default: ${DEFAULT_DIR})`,
  },
} as const satisfies Flags;

export const templatesPushCommand: Command = defineCommand({
  name: "templates push",
  summary: "Save templates' drafts from files (--watch, --publish)",
  usage: "[<path>...] [options]",
  description:
    "Replaces each template's draft with its folder's files (each path is a template folder or " +
    "a folder of them). The template is found by its alias, so one folder pushes to every " +
    "environment; one that doesn't exist yet is created. Sends keep using the published version " +
    "until you publish: --publish publishes after saving. Problems (syntax errors, undeclared " +
    "variables) are shown with their file, line and column.",
  flags: PUSH_FLAGS,
  positionals: true,
  run: push,
});

async function push({
  values,
  positionals,
  context,
}: CommandInput<typeof PUSH_FLAGS>): Promise<number> {
  const { out, io } = context;
  if (values.watch && values.publish) {
    throw new UsageError(
      "--watch saves drafts only: publish with `coss templates push --publish` when you're done.",
    );
  }
  const dirs = await templateDirs(
    positionals.length > 0 ? positionals : [values.dir ?? DEFAULT_DIR],
  );
  const coss = await client(context);
  let failed = false;
  const pushOne = async (dir: string) => {
    try {
      const result = await pushTemplate(coss, out, dir, { publish: values.publish === true });
      if (out.json) out.data(result);
    } catch (error) {
      if (!(error instanceof CliError)) throw error;
      failed = true;
      out.error(error.message);
    }
  };
  for (const dir of dirs) await pushOne(dir);
  if (!values.watch) return failed ? 1 : 0;

  out.info(
    `Watching ${dirs.length === 1 ? dirs[0] : `${dirs.length} templates`} for changes. Press Ctrl-C to stop.`,
  );
  // One push at a time; a folder changed again while it's being pushed is pushed once more after.
  let queue = Promise.resolve();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  for (const dir of dirs) {
    io.watch(dir, io.signal, (file) => {
      if (!isTemplateFile(file)) return;
      clearTimeout(timers.get(dir));
      timers.set(
        dir,
        setTimeout(() => {
          timers.delete(dir);
          queue = queue.then(() => pushOne(dir));
        }, WATCH_DEBOUNCE_MS),
      );
    });
  }
  await new Promise<void>((resolve) => {
    if (io.signal.aborted) resolve();
    else io.signal.addEventListener("abort", () => resolve(), { once: true });
  });
  for (const timer of timers.values()) clearTimeout(timer);
  await queue;
  return 130;
}

// ---- preview

const PREVIEW_FLAGS = {
  var: {
    type: "string",
    multiple: true,
    value: "<name=value>",
    description:
      "A variable (repeatable; values are JSON when they parse), over the template's sample values",
  },
  locale: { type: "string", value: "<locale>", description: "The locale to render, e.g. pt-BR" },
  version: {
    type: "string",
    value: "<number>",
    description: "Render a published version instead of the draft",
  },
  output: { type: "string", value: "<file>", description: "Write the rendered HTML to this file" },
  open: { type: "boolean", description: "Open the rendered HTML in your browser" },
  json: { type: "boolean", description: "Print the rendered subject, HTML and text as JSON" },
} as const satisfies Flags;

export const templatesPreviewCommand: Command = defineCommand({
  name: "templates preview",
  summary: "Render a template with variables, without sending",
  usage: "<id|alias|path> [options]",
  description:
    "Renders a template's draft (or --version) exactly as a send would and prints its subject " +
    "and text; --open shows the HTML in your browser, --output saves it. Nothing is sent. A " +
    "template folder previews the template it belongs to (push it first to see your edits).",
  flags: PREVIEW_FLAGS,
  positionals: true,
  run: preview,
});

async function preview({
  values,
  positionals,
  context,
}: CommandInput<typeof PREVIEW_FLAGS>): Promise<number> {
  const { out, io } = context;
  const [target, ...extra] = positionals;
  if (target === undefined || extra.length > 0) {
    throw new UsageError("Pass one template: `coss templates preview <id|alias|path>`.");
  }
  const version = values.version === undefined ? undefined : Number(values.version);
  if (version !== undefined && (!Number.isInteger(version) || version < 1)) {
    throw new UsageError("--version takes a published version number, e.g. 2.");
  }
  const coss = await client(context);

  let ref = target;
  let local: LocalTemplate | null = null;
  if (await isDir(target)) {
    local = await readTemplate(target);
    const found =
      (local.manifest.alias ? await getTemplate(coss, local.manifest.alias) : null) ??
      (local.manifest.id ? await getTemplate(coss, local.manifest.id) : null);
    if (!found) {
      throw new CliError(
        `${target} isn't in this environment yet: run \`coss templates push ${target}\`.`,
      );
    }
    ref = found.id;
  }

  const source =
    version === undefined
      ? await getDraft(coss, ref)
      : await coss.email.templates.versions.get(ref, version).then(({ data, error }) => {
          if (error) throw apiError(`Couldn't read version ${version} of ${ref}`, error);
          return data;
        });
  if (local && version === undefined && !sameDraft(draftOf(local), source)) {
    out.warn(
      `${local.dir} differs from the draft, which is what this shows: \`coss templates push ${local.dir}\` first.`,
    );
  }
  const variables = values.var
    ? {
        ...source.sample_variables,
        ...Object.fromEntries(
          pairs(values.var, "var").map(([name, raw]) => [name, jsonOrString(raw)]),
        ),
      }
    : undefined;
  const { data, error } = await coss.email.templates.render(
    ref,
    {
      ...(version !== undefined && { version }),
      ...(values.locale && { locale: values.locale }),
      ...(variables && { variables }),
    },
    { signal: io.signal },
  );
  if (error) throw apiError(`Couldn't render ${target}`, error);

  let htmlFile: string | null = null;
  if (data.html !== null && (values.output || values.open)) {
    htmlFile = values.output ?? join(tmpdir(), `coss-preview-${data.template_id}.html`);
    await writeFile(htmlFile, data.html);
  }
  if (out.json) out.data(data);
  else {
    out.line(`${out.style("dim", "Subject")}  ${data.subject}`);
    out.line(
      `${out.style("dim", "Locale ")}  ${data.locale} ${out.style("dim", data.version === null ? "(draft)" : `(version ${data.version})`)}`,
    );
    out.line();
    out.line(data.text ?? out.style("dim", "(no text part)"));
    if (data.html !== null) {
      out.line();
      out.info(
        out.style(
          "dim",
          htmlFile
            ? `HTML written to ${relative(process.cwd(), htmlFile) || htmlFile}.`
            : `HTML: ${data.html.length} characters. --open shows it in your browser, --output <file> saves it.`,
        ),
      );
    }
  }
  if (htmlFile && values.open && !(await io.openBrowser(pathToFileURL(htmlFile).href))) {
    out.warn(`Couldn't open a browser: open ${htmlFile} yourself.`);
  }
  return 0;
}
