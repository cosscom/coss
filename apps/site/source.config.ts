import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import { defineConfig } from "fumadocs-mdx/config";
import { transformerTwoslash } from "fumadocs-twoslash";
import { CODE_THEMES } from "./src/lib/site.ts";

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: CODE_THEMES,
      // Twoslash popups can't lazy-load languages, so load the ones they render up front.
      langs: ["ts", "tsx", "js", "jsx", "json", "bash"],
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        // ```ts twoslash blocks are compiled against the real `coss` package (packages/sdk/dist,
        // resolved from apps/site) and fail the build on unexpected type errors. No types cache:
        // a cached result would hide an SDK change that breaks a snippet.
        transformerTwoslash({
          twoslashOptions: { compilerOptions: { types: ["node"] } },
        }),
      ],
    },
  },
});
