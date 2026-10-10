/**
 * The dashboard shares coss.com with this site and is the default zone: a path reaches this app
 * only if it is in ZONE_ROUTES (packages/auth/src/slugs.ts), which the load balancer's rules are
 * generated from. Every route here must therefore be listed there (and its first segment is then
 * a reserved org slug, since org slugs are the dashboard's first URL segment).
 */
import { expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import path from "node:path";
import { RESERVED_ORG_SLUGS, SITE_ASSET_PREFIX, zoneForPath } from "@coss/auth/slugs";
import nextConfig from "../next.config";

const APP_DIR = path.resolve(import.meta.dir, "../src/app");

/**
 * Load-balancer health checks reach each target directly; these are never routed on coss.com
 * (where `/api/*` is the dashboard's).
 */
const UNROUTED = new Set(["/api"]);

/** Metadata files and the URL they are served at (`robots.ts` → `/robots.txt`). */
const METADATA_FILE =
  /^(icon|apple-icon|favicon|opengraph-image|twitter-image|sitemap|robots|manifest)\d*\.(\w+)$/;
const GENERATED_EXTENSION: Record<string, string> = {
  sitemap: "xml",
  robots: "txt",
  manifest: "webmanifest",
};

/** Top-level URL paths this app serves (route groups are transparent). */
function topLevelPaths(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const { name } = entry;
    if (entry.isDirectory()) {
      if (/^[[_@]/.test(name)) return [];
      if (name.startsWith("(") && name.endsWith(")")) return topLevelPaths(path.join(dir, name));
      return [`/${name}`];
    }
    if (/^(page|route)\.[jt]sx?$/.test(name)) return ["/"];
    const metadata = METADATA_FILE.exec(name);
    if (!metadata?.[1] || !metadata[2]) return [];
    const [, base, extension] = metadata;
    if (/^[jt]sx?$/.test(extension)) {
      const generated = GENERATED_EXTENSION[base];
      return [generated ? `/${base}.${generated}` : `/${base}`];
    }
    return [`/${name}`];
  });
}

test("every route of this app is routed to it on coss.com", () => {
  const paths = topLevelPaths(APP_DIR);
  expect(paths).toContain("/");
  expect(paths).toContain("/docs");
  expect(paths).toContain("/robots.txt");
  for (const urlPath of paths) {
    if (UNROUTED.has(urlPath)) continue;
    expect({ urlPath, zone: zoneForPath(urlPath) }).toEqual({ urlPath, zone: "site" });
    const segment = urlPath.split("/")[1];
    if (segment && !segment.includes(".")) expect(RESERVED_ORG_SLUGS.has(segment)).toBe(true);
  }
});

test("assets are served under the site's prefix, which is routed here", () => {
  expect(nextConfig.assetPrefix).toBe(SITE_ASSET_PREFIX);
  expect(zoneForPath(`${SITE_ASSET_PREFIX}/_next/static/chunks/main.js`)).toBe("site");
});
