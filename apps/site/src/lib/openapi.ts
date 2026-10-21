import "server-only";
import spec from "@coss/api/openapi.json";
import snippets from "@coss/sdkgen/snippets.json";
import type { Document } from "fumadocs-openapi";
import { createOpenAPI } from "fumadocs-openapi/server";
import { DEV_API_ORIGIN } from "./site";

/** The generated SDKs' code tabs, after TypeScript and cURL (`api-page.tsx`). */
const SDK_TABS = [
  { id: "python", label: "Python" },
  { id: "go", label: "Go" },
  { id: "ruby", label: "Ruby" },
  { id: "php", label: "PHP" },
  { id: "java", label: "Java" },
  { id: "csharp", label: ".NET" },
] as const;

/**
 * The public API's OpenAPI document. It is the committed snapshot apps/api/openapi.json (regenerate
 * with `bun run openapi:generate`), bundled at build time: the site never imports the API itself.
 */
export const openapi = createOpenAPI({
  input: { coss: withSdkSamples(withLocalServer(spec as unknown as Document)) },
});

/**
 * Every operation's sample in each generated SDK (sdks/*), as `x-codeSamples`: fixed examples from
 * tooling/sdkgen/snippets.json (`bun run sdks:generate`), rendered on the server, so they never
 * reach the page's JavaScript.
 */
function withSdkSamples(document: Document): Document {
  const samples = snippets as Record<string, Record<(typeof SDK_TABS)[number]["id"], string>>;
  const paths = Object.fromEntries(
    Object.entries(document.paths ?? {}).map(([path, item]) => [
      path,
      Object.fromEntries(
        Object.entries(item ?? {}).map(([method, operation]) => {
          const sample = samples[`${method.toUpperCase()} ${path}`];
          if (!sample || typeof operation !== "object" || operation === null)
            return [method, operation];
          const codeSamples = SDK_TABS.map(({ id, label }) => ({
            id,
            lang: id,
            label,
            source: sample[id],
          }));
          return [method, { ...operation, "x-codeSamples": codeSamples }];
        }),
      ),
    ]),
  );
  return { ...document, paths } as Document;
}

/** In `next dev`, samples and the playground target the local API (`bun run dev`) first. */
function withLocalServer(document: Document): Document {
  if (process.env.NODE_ENV !== "development") return document;
  const local = { url: DEV_API_ORIGIN, description: "Local API" };
  return { ...document, servers: [local, ...(document.servers ?? [])] };
}
