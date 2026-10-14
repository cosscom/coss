import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { applyMdxPreset } from "fumadocs-mdx/config";
import { defineDocs } from "fumadocs-mdx/macro";
import { z } from "zod";
import { rehypeNowrapTokens } from "./shipyard/rehype-nowrap-tokens.ts";
import { rehypeReference } from "./shipyard/rehype-reference.ts";
import { CODE_THEMES } from "./site.ts";

// Compiled by the fumadocs-mdx macro (next.config.ts): `dir` must stay a string literal. Kept apart
// from source.ts, which also loads the server-only OpenAPI source.
export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: pageSchema,
    // Markdown of each page for /llms-full.txt.
    postprocess: { includeProcessedMarkdown: true },
  },
  meta: { schema: metaSchema },
});

/** Terms, privacy policy and acceptable use policy at /legal/… (src/lib/legal.ts). */
export const legal = defineDocs({
  dir: "content/legal",
  docs: {
    // `lastUpdated` (YYYY-MM-DD) is shown on the page: change it with every substantive edit.
    schema: pageSchema.extend({ lastUpdated: z.iso.date() }),
  },
  meta: { schema: metaSchema },
});

/**
 * Shipyard's docs at /shipyard/docs (src/lib/shipyard-docs.ts), moved from the coss ui
 * repository's `apps/shipyard` (and before that `cosscom/shipyard`'s `docs/`). Their own
 * collection, so they stay out of coss's docs sidebar, search and /llms.txt, and so their rehype
 * plugins (reference tables made linkable, inline code wrapping only between words) don't touch
 * coss's pages: collection-level options replace the global ones, hence the preset is applied
 * here again (no Twoslash: the pages have no SDK snippets).
 */
export const shipyard = defineDocs({
  dir: "content/shipyard",
  docs: {
    schema: pageSchema,
    postprocess: { includeProcessedMarkdown: true },
    mdxOptions: applyMdxPreset({
      rehypeCodeOptions: { themes: CODE_THEMES },
      rehypePlugins: (plugins) => [...plugins, rehypeNowrapTokens, rehypeReference],
    }),
  },
  meta: { schema: metaSchema },
});

/**
 * kloq's docs at /kloq/docs (src/lib/calendar-docs.ts), moved from the
 * `cosscom/calendar` repository's `content/docs`. Their own collection, out of coss's docs sidebar,
 * search and /llms.txt; the global options are replaced per collection, so Shiki's themes are set
 * here again (no Twoslash: the examples are rendered live, not type-checked).
 */
export const calendar = defineDocs({
  dir: "content/calendar",
  docs: {
    schema: pageSchema,
    postprocess: { includeProcessedMarkdown: true },
    mdxOptions: applyMdxPreset({ rehypeCodeOptions: { themes: CODE_THEMES } }),
  },
  meta: { schema: metaSchema },
});
