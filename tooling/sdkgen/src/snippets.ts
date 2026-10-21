/**
 * Code samples of every operation in every generated SDK, for the docs' API reference. The calls
 * are the usage examples the generators write per endpoint (sdks/<language>/reference.md); each
 * sample adds the imports its types need and the client's setup, so it can be pasted as it is.
 * `bun run sdks:generate` writes them, keyed like `SDK_METHODS` (`METHOD /path`), to
 * tooling/sdkgen/snippets.json; the site adds them to its copy of the OpenAPI document as
 * `x-codeSamples`.
 */
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { SDK_METHODS } from "./methods.ts";

export const SNIPPET_LANGUAGES = ["python", "go", "ruby", "php", "java", "csharp"] as const;
export type SnippetLanguage = (typeof SNIPPET_LANGUAGES)[number];

/** `METHOD /path` → language → code. */
export type Snippets = Record<string, Record<SnippetLanguage, string>>;

/** Where each language declares its types: simple name → import (`com.coss.types.SendEmailRequest`). */
export type TypeIndex = Map<string, string[]>;

/** A method chain reduced to compare across languages: `client.Email.DedicatedIPs.GetAsync` → `email.dedicatedips.get`. */
export function normalizeChain(chain: string): string {
  return chain
    .replace(/^\$?client(->|\.)/, "")
    .split(/->|\./)
    .map((segment) =>
      segment
        .replace(/Async$/, "")
        .replace(/_+$/, "")
        .replaceAll("_", "")
        .toLowerCase(),
    )
    .join(".");
}

/** Each endpoint's usage example in a generator's reference.md, by normalized method chain. */
export function parseReference(markdown: string): Map<string, string> {
  const usages = new Map<string, string>();
  for (const section of markdown.split("<details><summary><code>").slice(1)) {
    const summary = (section.split("</code></summary>")[0] ?? "")
      .replace(/<[^>]+>/g, "")
      .replaceAll("&gt;", ">")
      .replaceAll("&lt;", "<");
    const chain = summary.split("(")[0]?.trim() ?? "";
    const code = section.split("#### 🔌 Usage")[1]?.match(/```[a-z]*\n([\s\S]*?)```/)?.[1];
    if (code) usages.set(normalizeChain(chain), code.trimEnd());
  }
  return usages;
}

/** Python's examples construct a client of their own: keep the call and any other imports. */
function pythonCall(code: string): { imports: string[]; call: string } {
  const lines = code.split("\n");
  const start = lines.findIndex((line) => line.startsWith("client = Coss("));
  if (start < 0) return { imports: [], call: code };
  const end = lines.findIndex((line, index) => index > start && line === ")");
  const imports = lines
    .slice(0, start)
    .filter((line) => /^(from|import) /.test(line))
    .filter((line) => !/^from coss import Coss$|^from coss\.environment import /.test(line));
  return {
    imports,
    call: lines
      .slice(end + 1)
      .join("\n")
      .trim(),
  };
}

/** The imports a sample's identifiers need, from the index (names declared twice are skipped). */
function importsFor(names: Iterable<string>, index: TypeIndex): string[] {
  const imports = new Set<string>();
  for (const name of names) {
    const candidates = (index.get(name) ?? []).filter(
      (path) => !/[./\\]core[./\\]|\.Core\b/i.test(path),
    );
    if (candidates.length === 1) imports.add(candidates[0] as string);
  }
  return [...imports].sort();
}

const JAVA_STANDARD: Record<string, string> = {
  Arrays: "java.util.Arrays",
  HashMap: "java.util.HashMap",
  List: "java.util.List",
  Map: "java.util.Map",
  Optional: "java.util.Optional",
  OffsetDateTime: "java.time.OffsetDateTime",
};

/** One complete sample: imports, the client, the call. */
export function completeSample(language: SnippetLanguage, code: string, index: TypeIndex): string {
  const identifiers = (pattern: RegExp) =>
    [...code.matchAll(pattern)].map((match) => match[1] as string);
  switch (language) {
    case "python": {
      const { imports, call } = pythonCall(code);
      return [
        ["from coss import Coss", ...imports].join("\n"),
        "client = Coss()  # api_key= or COSS_API_KEY",
        call,
      ].join("\n\n");
    }
    case "go": {
      const used = new Set<string>();
      for (const [, alias, name] of code.matchAll(/\b([a-z]+)\.([A-Z]\w*)/g)) {
        const path = index.get(`${alias}.${name}`)?.[0];
        if (path) used.add(`\t${alias} "${path}"`);
      }
      used.add('\tcossclient "github.com/cosscom/coss-go/client"');
      const block = ['\t"context"', "", ...[...used].sort()].join("\n");
      return [
        `import (\n${block}\n)`,
        "client := cossclient.NewClient() // option.WithAPIKey(…) or COSS_API_KEY",
        code,
      ].join("\n\n");
    }
    case "ruby":
      return ['require "coss"', "client = Coss::Client.new # api_key: or COSS_API_KEY", code].join(
        "\n\n",
      );
    case "php": {
      const names = [...identifiers(/\bnew\s+([A-Z]\w*)/g), ...identifiers(/\b([A-Z]\w*)::/g)];
      const uses = ["Coss\\Coss", ...importsFor(names, index)].map((path) => `use ${path};`);
      return [
        "<?php",
        uses.join("\n"),
        "$client = new Coss(); // apiKey: or COSS_API_KEY",
        code,
      ].join("\n\n");
    }
    case "java": {
      const names = identifiers(/\b([A-Z]\w*)\b/g);
      const standard = names.flatMap((name) => (JAVA_STANDARD[name] ? [JAVA_STANDARD[name]] : []));
      const imports = [
        ...new Set(["com.coss.Coss", ...importsFor(names, index), ...standard]),
      ].sort();
      return [
        imports.map((path) => `import ${path};`).join("\n"),
        "Coss client = Coss.builder().build(); // .apiKey(…) or COSS_API_KEY",
        code,
      ].join("\n\n");
    }
    case "csharp": {
      const namespaces = new Set(["Coss"]);
      for (const path of importsFor(identifiers(/\b([A-Z]\w*)\b/g), index)) {
        namespaces.add(path.slice(0, path.lastIndexOf(".")));
      }
      const usings = [...namespaces].sort().map((namespace) => `using ${namespace};`);
      return [
        usings.join("\n"),
        "var client = new CossClient(); // apiKey: or COSS_API_KEY",
        code,
      ].join("\n\n");
    }
  }
}

/** Indexes the type (and, for Go, function) declarations of a generated SDK. */
export async function indexTypes(language: SnippetLanguage, dir: string): Promise<TypeIndex> {
  const index: TypeIndex = new Map();
  const add = (name: string, path: string) => index.set(name, [...(index.get(name) ?? []), path]);
  const source = { python: "", go: ".go", ruby: "", php: ".php", java: ".java", csharp: ".cs" }[
    language
  ];
  if (!source) return index;
  const root = {
    go: dir,
    php: join(dir, "src"),
    java: join(dir, "src/main/java"),
    csharp: join(dir, "src"),
  }[language as "go" | "php" | "java" | "csharp"];
  for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
    if (
      !entry.isFile() ||
      !entry.name.endsWith(source) ||
      /_test\.go$|\.Test\b/.test(join(entry.parentPath, entry.name))
    ) {
      continue;
    }
    const text = await Bun.file(join(entry.parentPath, entry.name)).text();
    if (language === "go") {
      const name = text.match(/^package (\w+)$/m)?.[1];
      const rel = relative(dir, entry.parentPath);
      const path = rel === "" ? "github.com/cosscom/coss-go" : `github.com/cosscom/coss-go/${rel}`;
      for (const [, declared] of text.matchAll(/^(?:type|func) (\w+)/gm))
        add(`${name}.${declared}`, path);
    } else {
      const namespace = text.match(/^(?:namespace|package) ([\w.\\]+);/m)?.[1];
      if (!namespace) continue;
      const separator = language === "php" ? "\\" : ".";
      const declarations = text.matchAll(
        /^(?:public |internal )?(?:final |sealed |static |partial |abstract |readonly )*(?:class|record|enum|interface|struct) (\w+)/gm,
      );
      for (const [, declared] of declarations)
        add(declared as string, `${namespace}${separator}${declared}`);
    }
  }
  return index;
}

/**
 * Every operation's sample in every language. An operation no SDK has yet (added to the API since
 * they were last generated) is left out; one only some have fails.
 */
export function buildSnippets(
  references: Record<SnippetLanguage, string>,
  indexes: Record<SnippetLanguage, TypeIndex>,
): Snippets {
  const usages = Object.fromEntries(
    SNIPPET_LANGUAGES.map((language) => [language, parseReference(references[language])]),
  ) as Record<SnippetLanguage, Map<string, string>>;
  const snippets: Snippets = {};
  const missing: string[] = [];
  for (const [operation, method] of Object.entries(SDK_METHODS)) {
    const chain = normalizeChain(method);
    const absent = SNIPPET_LANGUAGES.filter((language) => !usages[language].has(chain));
    if (absent.length === SNIPPET_LANGUAGES.length) continue;
    for (const language of absent) missing.push(`${language}: ${operation} (${method})`);
    const samples = {} as Record<SnippetLanguage, string>;
    for (const language of SNIPPET_LANGUAGES) {
      const code = usages[language].get(chain);
      if (code !== undefined) samples[language] = completeSample(language, code, indexes[language]);
    }
    snippets[operation] = samples;
  }
  if (missing.length > 0)
    throw new Error(`No usage example in reference.md for:\n${missing.join("\n")}`);
  return snippets;
}
