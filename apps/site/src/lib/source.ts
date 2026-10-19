import "server-only";
import spec from "@coss/api/openapi.json";
import { llms, loader } from "fumadocs-core/source";
import { sectionsMarkdown } from "../components/docs-sections";
import { renderApiKeyComponents } from "./api-key-permissions-text";
import { renderBillingComponents } from "./billing-text";
import { docs } from "./collections";
import { sectionsOf } from "./docs-tree";
import { kebabCase } from "./kebab-case";
import { openapi } from "./openapi";
import { renderRetentionComponents } from "./retention-text";
import { renderRiskComponents } from "./risk-text";
import { DOCS_ROUTE } from "./site";

/**
 * Every docs page: MDX from content/docs, plus one virtual page per API operation under
 * /docs/api-reference/<tag>/… (content/docs/api-reference/meta.json places them in the sidebar).
 */
export const source = loader(
  {
    docs: docs.toFumadocsSource(),
    openapi: await apiReferenceSource(),
  },
  {
    baseUrl: DOCS_ROUTE,
    plugins: [openapi.loaderPlugin()],
  },
);

/**
 * The API operations, one folder per tag. Each tag's meta.json gives its display name ("Dedicated
 * IPs") and the operations in the document's order; the root one is dropped, since
 * content/docs/api-reference/meta.json groups the tags by product.
 */
async function apiReferenceSource() {
  const { files } = await openapi.staticSource({
    baseDir: "api-reference",
    per: "operation",
    groupBy: "tag",
    meta: true,
    // operationId `sendEmail` → /docs/api-reference/emails/send-email
    name(output) {
      if (output.type !== "operation") return kebabCase(output.item.name);
      const { path, method } = output.item;
      const id = this.document.paths?.[path]?.[method]?.operationId;
      if (!id) throw new Error(`${method.toUpperCase()} ${path} needs an operationId.`);
      return kebabCase(id);
    },
  });
  // Fumadocs titles a tag from its name word by word ("Dedicated I Ps"): use the name as written.
  const tags = new Map<string, string>();
  for (const operations of Object.values(spec.paths)) {
    for (const operation of Object.values(operations)) {
      for (const tag of operation.tags ?? []) tags.set(kebabCase(tag), tag);
    }
  }
  return {
    files: files
      .filter((file) => file.path !== "api-reference/meta.json")
      .map((file) => {
        const tag = file.type === "meta" && tags.get(file.path.split("/")[1] ?? "");
        return tag ? { ...file, data: { ...file.data, title: tag } } : file;
      }),
  };
}

export type DocsPage = NonNullable<ReturnType<typeof source.getPage>>;

/** A page as Markdown: the "Copy Markdown" button, /llms.txt and /llms-full.txt. */
export async function pageMarkdown(page: DocsPage): Promise<string> {
  const heading = `# ${page.data.title} (${page.url})`;
  if (page.type === "openapi") {
    const text = page.data.structuredData.contents.map((item) => item.content);
    return [heading, page.data.description, ...text].filter(Boolean).join("\n\n");
  }
  const body = (await page.data.getText("processed")).replaceAll(
    "<DocsSections />",
    sectionsMarkdown(sectionsOf(source.getPageTree())),
  );
  return `${heading}\n\n${renderApiKeyComponents(
    renderRiskComponents(renderBillingComponents(renderRetentionComponents(body))),
  )}`;
}

/** /llms.txt and /llms-full.txt. */
export const docsLlms = llms(source, { renderPage: pageMarkdown });
