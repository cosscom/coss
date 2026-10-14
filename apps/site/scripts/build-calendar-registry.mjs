/**
 * Build the Calendar UI kit's shadcn registry payloads (kloq.dev's `scripts/build-registry.mjs`):
 * inline each catalog item's source into `src/lib/calendar/registry/generated.json`, which the
 * `/calendar/r/[name]` route imports.
 *
 * Run after editing anything under packages/kloq/src/ or src/lib/calendar/registry/:
 *   bun run calendar:registry
 * The output is committed — the route must not read the filesystem at request time, and the diff
 * doubles as a review of what shipped. `test/calendar-registry.test.ts` fails when it is stale.
 *
 * `buildRegistry()` is exported so the test can rebuild the payload in memory and compare it to
 * the committed file.
 *
 * Two item shapes (see src/lib/calendar/registry/manifest.ts):
 *  - `sourceRoot`: the whole tree (minus tests/benches) targeted to
 *    components/kloq/… — this is how the core `kloq` item ships the library.
 *  - `files`: additional hand-listed files. These are written against the
 *    workspace's `"kloq"` path aliases so they compile in this repo; the
 *    build rewrites those imports to the copied-source locations consumers
 *    actually have.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { argv } from "node:process";
import { fileURLToPath } from "node:url";

import { REGISTRY_ITEMS } from "../src/lib/calendar/registry/manifest.ts";

// paths in the manifest are relative to the monorepo root
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** Longest-first, so subpaths win over the bare specifier. */
const IMPORT_REWRITES = [
  ["kloq/styles.css", "@/components/kloq/styles/kloq.css"],
  ["kloq/design-mode", "@/components/kloq/design-mode"],
  ["kloq/settings", "@/components/kloq/settings"],
  ["kloq/themes", "@/components/kloq/lib/themes"],
  ["kloq", "@/components/kloq"],
];

function rewriteImports(source) {
  return source.replace(/(from\s+|import\s+)"(kloq[^"]*)"/g, (whole, lead, spec) => {
    for (const [from, to] of IMPORT_REWRITES) {
      if (spec === from) return `${lead}"${to}"`;
    }
    return whole;
  });
}

const SKIP = /\.test\.|\.bench\.|(^|\/)bench(\/|$)/;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name))
    .filter((p) => !SKIP.test(relative(root, p)))
    .sort();
}

const fileType = (path) => (/\.(ts|tsx)$/.test(path) ? "registry:component" : "registry:file");

/** The payload, exactly as it is written to disk — trailing newline included. */
export async function buildRegistry() {
  const items = await Promise.all(
    REGISTRY_ITEMS.map(async (item) => {
      let files = [];
      if (item.sourceRoot) {
        const abs = join(root, item.sourceRoot);
        files = await Promise.all(
          (await walk(abs)).map(async (path) => {
            const target = join("components/kloq", relative(abs, path));
            return {
              path: target,
              target,
              type: fileType(path),
              content: await readFile(path, "utf8"),
            };
          }),
        );
      }

      files.push(
        ...(await Promise.all(
          (item.files ?? []).map(async (file) => ({
            path: file.target,
            target: file.target,
            type: fileType(file.path),
            content: rewriteImports(await readFile(join(root, file.path), "utf8")),
          })),
        )),
      );

      return {
        $schema: "https://ui.shadcn.com/schema/registry-item.json",
        name: item.name,
        type: item.type,
        title: item.title,
        description: item.description,
        dependencies: item.dependencies,
        ...(item.registryDependencies ? { registryDependencies: item.registryDependencies } : {}),
        files,
      };
    }),
  );

  return {
    items,
    json: JSON.stringify({ items }, null, 2) + "\n",
    whatLandsJson: JSON.stringify(whatLands(items), null, 2) + "\n",
  };
}

/** File and line counts for the core item, so pages can show them without importing the payload. */
function whatLands(items) {
  const item = items.find((i) => i.name === "kloq");
  const lines = (s) => s.split("\n").length;
  const dirs = new Map();
  for (const file of item.files) {
    const rest = file.path.replace(/^components\/kloq\//, "");
    const key = rest.includes("/") ? rest.split("/")[0] + "/" : rest;
    const entry = dirs.get(key) ?? { path: key, files: 0, lines: 0 };
    entry.files += 1;
    entry.lines += lines(file.content ?? "");
    dirs.set(key, entry);
  }
  return {
    files: item.files.length,
    lines: item.files.reduce((n, f) => n + lines(f.content ?? ""), 0),
    dirs: [...dirs.values()].sort((a, b) => b.lines - a.lines),
  };
}

export const GENERATED_PATH = join(root, "apps/site/src/lib/calendar/registry/generated.json");
export const WHAT_LANDS_PATH = join(
  root,
  "apps/site/src/components/calendar/registry/what-lands.json",
);

// only when run as a script — the test imports buildRegistry instead
if (argv[1] === fileURLToPath(import.meta.url)) {
  const { items, json, whatLandsJson } = await buildRegistry();
  await writeFile(GENERATED_PATH, json);
  await writeFile(WHAT_LANDS_PATH, whatLandsJson);
  const total = items.reduce((n, i) => n + i.files.length, 0);
  console.log(`wrote ${items.length} items, ${total} files → ${GENERATED_PATH}`);
}
