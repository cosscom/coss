import "server-only";
import { llms, loader } from "fumadocs-core/source";
import { renderBillingComponents } from "./billing-text";
import { docs } from "./collections";
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
    plugins: [openapi.loaderPlugin()],
  },
);

function kebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

export type DocsPage = NonNullable<ReturnType<typeof source.getPage>>;

/** A page as Markdown: the "Copy Markdown" button, /llms.txt and /llms-full.txt. */
export async function pageMarkdown(page: DocsPage): Promise<string> {
  const heading = `# ${page.data.title} (${page.url})`;
  if (page.type === "openapi") {
    const text = page.data.structuredData.contents.map((item) => item.content);
    return [heading, page.data.description, ...text].filter(Boolean).join("\n\n");
  }
  const body = await page.data.getText("processed");
  return `${heading}\n\n${renderRiskComponents(renderBillingComponents(renderRetentionComponents(body)))}`;
}

/** /llms.txt and /llms-full.txt. */
export const docsLlms = llms(source, { renderPage: pageMarkdown });
