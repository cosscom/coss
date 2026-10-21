/**
 * `bun run --cwd tooling/sdkgen snippets`: rewrites snippets.json (every operation's sample in every
 * SDK, for the docs) from the generated SDKs in sdks/. `sdks:generate` runs it after generating.
 */
import { join } from "node:path";
import { LANGUAGES } from "../src/languages.ts";
import {
  buildSnippets,
  indexTypes,
  SNIPPET_LANGUAGES,
  type SnippetLanguage,
  type TypeIndex,
} from "../src/snippets.ts";

export async function writeSnippets(): Promise<void> {
  const sdks = join(import.meta.dir, "../../../sdks");
  const references = {} as Record<SnippetLanguage, string>;
  const indexes = {} as Record<SnippetLanguage, TypeIndex>;
  for (const language of SNIPPET_LANGUAGES) {
    const dir = join(
      sdks,
      LANGUAGES.find((candidate) => candidate.group === language)?.dir ?? language,
    );
    references[language] = await Bun.file(join(dir, "reference.md")).text();
    indexes[language] = await indexTypes(language, dir);
  }
  const snippets = buildSnippets(references, indexes);
  await Bun.write(
    join(import.meta.dir, "../snippets.json"),
    `${JSON.stringify(snippets, null, 2)}\n`,
  );
}

if (import.meta.main) await writeSnippets();
