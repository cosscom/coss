/**
 * `bun run sdks:generate [--lang python,go,…]`: regenerates sdks/<language> from
 * apps/api/openapi.json. Needs Docker (Fern runs each generator in its own image, and packages it
 * in the language's official image, so no language toolchain is needed here). Files listed in a
 * SDK's `.fernignore` (its hand-written code) are kept; everything else is rewritten.
 */
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import spec from "@coss/api/openapi.json" with { type: "json" };
import { deriveSdkSpec, type OpenApiDocument } from "../src/derive.ts";
import { LANGUAGES, postProcess } from "../src/languages.ts";
import { writeSnippets } from "./snippets.ts";

const root = join(import.meta.dir, "../../..");
const sdks = join(root, "sdks");

const { values } = parseArgs({ options: { lang: { type: "string" } } });
const selected = values.lang ? values.lang.split(",") : LANGUAGES.map((language) => language.group);
const unknown = selected.filter((group) => !LANGUAGES.some((language) => language.group === group));
if (unknown.length > 0) throw new Error(`Unknown --lang: ${unknown.join(", ")}`);

const version = (await Bun.file(join(sdks, "VERSION")).text()).trim();
// The Fern CLI at the version fern.config.json pins (the CLI insists on it anyway).
const fernConfig: { version: string } = await Bun.file(join(sdks, "fern/fern.config.json")).json();

for (const language of LANGUAGES.filter((language) => selected.includes(language.group))) {
  console.error(`Generating ${language.group} ${version}…`);
  // One spec per language, written where generators.yml reads it, just before its group runs.
  const derived = deriveSdkSpec(spec as unknown as OpenApiDocument, language.group);
  await Bun.write(join(sdks, "fern/openapi.sdk.json"), `${JSON.stringify(derived, null, 2)}\n`);
  // `--package` makes some generators write their project files too (`Language.package`); the
  // artifacts it builds (fern-dist/) are thrown away.
  const packaging = language.package ? ["--package", "--package-mode", "docker"] : [];
  // Ours (`bun run --cwd tooling/sdkgen bump` writes the entries), but Fern adds a dated heading
  // to it, .fernignore or not.
  const dir = join(sdks, language.dir);
  const changelog = await Bun.file(join(dir, "CHANGELOG.md")).text();
  const fern = Bun.spawn(
    [
      "bun",
      "x",
      `fern-api@${fernConfig.version}`,
      "generate",
      "--local",
      "--force",
      "--group",
      language.group,
      "--version",
      version,
      ...packaging,
    ],
    {
      cwd: sdks,
      env: { ...process.env, FERN_DISABLE_TELEMETRY: "true", FERN_NO_VERSION_REDIRECTION: "true" },
      stdout: "inherit",
      stderr: "inherit",
    },
  );
  if ((await fern.exited) !== 0) throw new Error(`fern generate failed for ${language.group}`);
  await Bun.write(join(dir, "CHANGELOG.md"), changelog);
  await rm(join(dir, "fern-dist"), { recursive: true, force: true });
  await postProcess(language, dir);
}

await writeSnippets();
