/**
 * Rewrites `src/version.ts` from `package.json` after `changeset version` bumps it (run by the root
 * `version-packages` script), so the User-Agent always names the released version.
 */
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const { version } = JSON.parse(await readFile(new URL("package.json", root), "utf8")) as {
  version: string;
};
await writeFile(
  new URL("src/version.ts", root),
  "/** SDK version, sent in the User-Agent. A test keeps it equal to package.json's `version`. */\n" +
    `export const VERSION = ${JSON.stringify(version)};\n`,
);
console.log(`coss: src/version.ts = ${version}`);
