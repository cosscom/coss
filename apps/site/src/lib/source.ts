import "server-only";
import { llms, loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { docs } from "./collections";
import { openapi } from "./openapi";
import { renderRetentionComponents } from "./retention-text";
import { DOCS_ROUTE } from "./site";

/**
 * Every docs page: MDX from content/docs, plus one virtual page per API operation under
 * /docs/api-reference/<tag>/… (content/docs/api-reference/meta.json places them in the sidebar).
 */
export const source = loader(
  {
    docs: docs.toFumadocsSource(),
    openapi: await openapi.staticSource({
      baseDir: "api-reference",
      per: "operation",
      groupBy: "tag",
      // operationId `sendEmail` → /docs/api-reference/emails/send-email
      name(output) {
        if (output.type !== "operation") return kebabCase(output.item.name);
        const { path, method } = output.item;
        const id = this.document.paths?.[path]?.[method]?.operationId;
        if (!id) throw new Error(`${method.toUpperCase()} ${path} needs an operationId.`);
        return kebabCase(id);
      },
    }),
  },
  {
    baseUrl: DOCS_ROUTE,
    plugins: [lucideIconsPlugin(), openapi.loaderPlugin()],
  },
);

function kebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

export type DocsPage = NonNullable<ReturnType<typeof source.getPage>>;

/** /llms.txt and /llms-full.txt. */
export const docsLlms = llms(source, {
  renderPage: async (page) => {
    const heading = `# ${page.data.title} (${page.url})`;
    if (page.type === "openapi") {
      const text = page.data.structuredData.contents.map((item) => item.content);
      return [heading, page.data.description, ...text].filter(Boolean).join("\n\n");
    }
    return `${heading}\n\n${renderRetentionComponents(await page.data.getText("processed"))}`;
  },
});
