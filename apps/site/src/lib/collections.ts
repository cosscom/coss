import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineDocs } from "fumadocs-mdx/macro";

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
