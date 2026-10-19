/**
 * Templates as files: one folder per template (named by its alias, else its id) holding
 * `template.json` (name, alias, variables, sample values) and per locale `<locale>.subject.txt`,
 * `<locale>.html` and `<locale>.txt`. Bodies are written and read byte for byte, so a pull followed
 * by a push changes nothing; only the subject's trailing newline is dropped (subjects are one line).
 */
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  EmailTemplate,
  EmailTemplateVersion,
  TemplateContentParams,
  TemplateVariableParams,
} from "coss";
import { CliError } from "../errors.ts";

export const MANIFEST = "template.json";

export type Manifest = {
  /** The template's id in the environment it was pulled from. */
  id?: string;
  /** The template's name in every environment: push finds (or creates) it by this. */
  alias?: string | null;
  name: string;
  description?: string | null;
  default_locale?: string;
  variables?: TemplateVariableParams[];
  sample_variables?: Record<string, unknown>;
};

export type LocalTemplate = { dir: string; manifest: Manifest; contents: TemplateContentParams[] };

export type DraftContent = {
  default_locale: string;
  variables: TemplateVariableParams[];
  sample_variables: Record<string, unknown>;
  contents: TemplateContentParams[];
};

const SUBJECT = /^(.+)\.subject\.txt$/;

export function fileName(locale: string, field: "subject" | "html" | "text"): string {
  return field === "subject"
    ? `${locale}.subject.txt`
    : `${locale}.${field === "html" ? "html" : "txt"}`;
}

/** Whether a change to this file in a template folder matters to it. */
export function isTemplateFile(file: string): boolean {
  return file === MANIFEST || SUBJECT.test(file) || /^[A-Za-z0-9-]+\.(html|txt)$/.test(file);
}

export function folderName(template: Pick<EmailTemplate, "alias" | "id">): string {
  return template.alias ?? template.id;
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/** Writes a template's draft into `dir`, removing files of locales it no longer has. */
export async function writeTemplate(
  dir: string,
  template: EmailTemplate,
  draft: EmailTemplateVersion,
): Promise<void> {
  await mkdir(dir, { recursive: true });
  const manifest: Manifest = {
    id: template.id,
    alias: template.alias,
    name: template.name,
    description: template.description,
    default_locale: draft.default_locale,
    variables: draft.variables,
    sample_variables: draft.sample_variables,
  };
  await writeFile(join(dir, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
  const keep = new Set([MANIFEST]);
  for (const content of draft.contents) {
    const subject = fileName(content.locale, "subject");
    await writeFile(join(dir, subject), `${content.subject}\n`);
    keep.add(subject);
    for (const field of ["html", "text"] as const) {
      const value = content[field];
      if (value === null) continue;
      await writeFile(join(dir, fileName(content.locale, field)), value);
      keep.add(fileName(content.locale, field));
    }
  }
  // Only files of locales this folder holds (by their subject file) are removed: never a README.
  const locales = (await readdir(dir))
    .map((file) => SUBJECT.exec(file)?.[1])
    .filter((locale): locale is string => locale !== undefined);
  for (const locale of locales) {
    for (const field of ["subject", "html", "text"] as const) {
      const file = fileName(locale, field);
      if (!keep.has(file)) await rm(join(dir, file), { force: true });
    }
  }
}

/** Reads the template in `dir`. */
export async function readTemplate(dir: string): Promise<LocalTemplate> {
  const text = await readOptional(join(dir, MANIFEST));
  if (text === null) throw new CliError(`${dir} has no ${MANIFEST}.`);
  let manifest: Manifest;
  try {
    manifest = JSON.parse(text) as Manifest;
  } catch (error) {
    throw new CliError(`${join(dir, MANIFEST)} isn't valid JSON: ${(error as Error).message}`);
  }
  if (typeof manifest !== "object" || manifest === null || typeof manifest.name !== "string") {
    throw new CliError(`${join(dir, MANIFEST)} needs at least a "name".`);
  }
  const contents: TemplateContentParams[] = [];
  const locales = (await readdir(dir))
    .map((file) => SUBJECT.exec(file)?.[1])
    .filter((locale): locale is string => locale !== undefined)
    .sort();
  for (const locale of locales) {
    const subject = (await readOptional(join(dir, fileName(locale, "subject")))) ?? "";
    contents.push({
      locale,
      subject: subject.replace(/[\r\n]+$/, ""),
      html: await readOptional(join(dir, fileName(locale, "html"))),
      text: await readOptional(join(dir, fileName(locale, "text"))),
    });
  }
  // The default locale first: the API takes the first one when the manifest names none.
  const first = manifest.default_locale;
  contents.sort((a, b) => Number(b.locale === first) - Number(a.locale === first));
  return { dir, manifest, contents };
}

/** Saves `id` into the folder's manifest (a template push just created). */
export async function rememberId(dir: string, id: string): Promise<void> {
  const path = join(dir, MANIFEST);
  const manifest = JSON.parse(await readFile(path, "utf8")) as Manifest;
  await writeFile(path, `${JSON.stringify({ id, ...manifest }, null, 2)}\n`);
}

/** Template folders: each path is one (it has a `template.json`) or a folder of them. */
export async function templateDirs(paths: readonly string[]): Promise<string[]> {
  const dirs: string[] = [];
  for (const path of paths) {
    if (await exists(join(path, MANIFEST))) {
      dirs.push(path);
      continue;
    }
    let entries: string[];
    try {
      entries = await readdir(path);
    } catch {
      throw new CliError(`${path} isn't a template folder or a folder of them.`);
    }
    const found: string[] = [];
    for (const entry of entries.sort()) {
      if (await exists(join(path, entry, MANIFEST))) found.push(join(path, entry));
    }
    if (found.length === 0) {
      throw new CliError(`No templates in ${path}: run \`coss templates pull\` first.`);
    }
    dirs.push(...found);
  }
  return dirs;
}

/** The draft the files describe. */
export function draftOf(local: LocalTemplate): DraftContent {
  return {
    default_locale: local.manifest.default_locale ?? local.contents[0]?.locale ?? "en",
    variables: local.manifest.variables ?? [],
    sample_variables: local.manifest.sample_variables ?? {},
    contents: local.contents,
  };
}

function canonical(locale: string): string {
  try {
    return Intl.getCanonicalLocales(locale)[0] ?? locale;
  } catch {
    return locale;
  }
}

/** A draft in the form the API returns it, to tell whether the files change anything. */
function normalized(draft: DraftContent): unknown {
  return {
    default_locale: canonical(draft.default_locale),
    variables: draft.variables.map((variable) => ({
      ...variable,
      required: variable.required ?? true,
      ...(variable.fields && {
        fields: variable.fields.map((field) => ({ ...field, required: field.required ?? true })),
      }),
    })),
    sample_variables: draft.sample_variables,
    contents: draft.contents
      .map((content) => ({
        locale: canonical(content.locale),
        subject: content.subject,
        html: content.html || null,
        text: content.text || null,
      }))
      .sort((a, b) => a.locale.localeCompare(b.locale)),
  };
}

/** Deep equality of JSON values, ignoring key order. */
function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = (value: object) =>
    Object.keys(value).filter((key) => (value as Record<string, unknown>)[key] !== undefined);
  const [ka, kb] = [keys(a), keys(b)];
  return (
    ka.length === kb.length &&
    ka.every((key) =>
      same((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
    )
  );
}

export function sameDraft(local: DraftContent, remote: EmailTemplateVersion): boolean {
  return same(normalized(local), normalized(remote));
}
