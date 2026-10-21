/**
 * `bun run --cwd tooling/sdkgen bump [--commit <sha>]`: the next minor version of every SDK
 * (sdks/VERSION, which `sdks:generate` writes into each one) and a CHANGELOG.md entry for it in
 * each. Run by sdks-regenerate.yml when regenerating changed an SDK; regenerate again afterwards.
 */
import { join } from "node:path";
import { parseArgs } from "node:util";
import { LANGUAGES } from "../src/languages.ts";

const { values } = parseArgs({ options: { commit: { type: "string" } } });
const sdks = join(import.meta.dir, "../../../sdks");

const current = (await Bun.file(join(sdks, "VERSION")).text()).trim();
const [major = 0, minor = 0] = current.split(".").map(Number);
const next = `${major}.${minor + 1}.0`;
await Bun.write(join(sdks, "VERSION"), `${next}\n`);

const source = values.commit ? ` at ${values.commit.slice(0, 12)}` : "";
const entry = [
  `## ${next}`,
  "",
  `- Regenerated from the API's OpenAPI document${source}. What changed in the API: the`,
  "  [API changelog](https://coss.com/docs/api-reference/changelog).",
  "",
].join("\n");
for (const language of LANGUAGES) {
  const path = join(sdks, language.dir, "CHANGELOG.md");
  const changelog = await Bun.file(path).text();
  await Bun.write(path, changelog.replace("# Changelog\n\n", `# Changelog\n\n${entry}\n`));
}
console.log(next);
