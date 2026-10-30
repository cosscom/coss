import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OpenAPIPage } from "@/components/api-page";
import { DocsPageFrame } from "@/components/docs-frame";
import { DocsSections } from "@/components/docs-sections";
import { JsonLd } from "@/components/json-ld";
import { getMDXComponents } from "@/components/mdx";
import { neighbours, sectionsOf } from "@/lib/docs-tree";
import { articleSchema, breadcrumbSchema } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";
import { type DocsPage, markdownUrl, pageMarkdown, source } from "@/lib/source";

/** A docs page as a TechArticle, with its trail through the docs. */
function DocsJsonLd({ page }: { page: DocsPage }) {
  return (
    <>
      <JsonLd
        data={articleSchema({
          type: "TechArticle",
          title: page.data.title ?? "",
          description: page.data.description,
          path: page.url,
        })}
      />
      <JsonLd
        data={breadcrumbSchema(
          page.url === "/docs"
            ? [["Docs", "/docs"]]
            : [
                ["Docs", "/docs"],
                [page.data.title ?? "", page.url],
              ],
        )}
      />
    </>
  );
}

export default async function Page({ params }: PageProps<"/docs/[[...slug]]">) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const markdown = await pageMarkdown(page);
  const tree = source.getPageTree();
  const around = neighbours(tree, page.url);

  if (page.type === "openapi") {
    // The operation renders its own description, in Fumadocs' prose styling.
    return (
      <>
        <DocsJsonLd page={page} />
        <DocsPageFrame
          markdown={markdown}
          neighbours={around}
          title={page.data.title}
          toc={page.data.toc}
        >
          <div className="prose max-w-none">
            <OpenAPIPage {...page.data.getOpenAPIPageProps()} />
          </div>
        </DocsPageFrame>
      </>
    );
  }

  const MDX = page.data.body;
  return (
    <>
      <DocsJsonLd page={page} />
      <DocsPageFrame
        description={page.data.description}
        markdown={markdown}
        neighbours={around}
        title={page.data.title}
        toc={page.data.toc}
      >
        <MDX
          components={getMDXComponents({
            DocsSections: () => <DocsSections current={page.url} sections={sectionsOf(tree)} />,
          })}
        />
      </DocsPageFrame>
    </>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

// Every page is prerendered: anything else is a 404 straight away, never rendered on demand
// (which would also try to cache the result in the read-only image).
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/docs/[[...slug]]">): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();
  return {
    title: page.data.title,
    description: page.data.description,
    // The page as Markdown, for agents that land on the HTML.
    alternates: { canonical: page.url, types: { "text/markdown": markdownUrl(page.url) } },
    openGraph: {
      type: "article",
      url: page.url,
      siteName: SITE_NAME,
      title: page.data.title,
      description: page.data.description,
    },
  };
}
