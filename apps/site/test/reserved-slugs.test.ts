/**
 * The dashboard shares coss.com with this site, and organization slugs are the dashboard's first
 * URL segment (`/acme`). Every top-level route of this site must therefore be a reserved slug, or
 * an organization could take its URL. Add new ones to RESERVED_ORG_SLUGS (packages/auth/src/slugs.ts).
 */
import { expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import path from "node:path";
import { RESERVED_ORG_SLUGS } from "@coss/auth/slugs";

const APP_DIR = path.resolve(import.meta.dir, "../src/app");

/** Top-level URL segments: folders (route groups are transparent). Names with a dot (`llms.txt`) can't be slugs. */
function topLevelSegments(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const { name } = entry;
    if (!entry.isDirectory() || name.includes(".") || /^[[_@]/.test(name)) return [];
    if (name.startsWith("(") && name.endsWith(")")) return topLevelSegments(path.join(dir, name));
    return [name];
  });
}

test("every top-level route is a reserved organization slug", () => {
  const segments = topLevelSegments(APP_DIR);
  expect(segments).toContain("docs");
  for (const segment of segments) {
    expect({ segment, reserved: RESERVED_ORG_SLUGS.has(segment) }).toEqual({
      segment,
      reserved: true,
    });
  }
});
