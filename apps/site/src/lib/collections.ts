import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineDocs } from "fumadocs-mdx/macro";
import { z } from "zod";

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
