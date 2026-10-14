/**
 * The Calendar UI kit's registry (/calendar/r/*.json) serves a committed payload: the library's
 * source inlined by scripts/build-calendar-registry.mjs. It must be rebuilt after a change to
 * packages/kloq/src or the add-on blocks, or the registry ships old code.
 */
import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import {
  buildRegistry,
  GENERATED_PATH,
  WHAT_LANDS_PATH,
} from "../scripts/build-calendar-registry.mjs";

test("the committed registry payload is what a build produces (bun run calendar:registry)", async () => {
  const [committed, whatLands, built] = await Promise.all([
    readFile(GENERATED_PATH, "utf8"),
    readFile(WHAT_LANDS_PATH, "utf8"),
    buildRegistry(),
  ]);
  const previous = JSON.parse(committed).items.map(
    (item: { name: string; files: { path: string }[] }) => ({
      name: item.name,
      files: item.files.map((file) => file.path),
    }),
  );
  expect(previous).toEqual(
    built.items.map((item) => ({ name: item.name, files: item.files.map((file) => file.path) })),
  );
  expect(committed).toBe(built.json);
  expect(whatLands).toBe(built.whatLandsJson);
});
