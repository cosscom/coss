import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OpenAPIPage } from "@/components/api-page";
import { DocsPageFrame } from "@/components/docs-frame";
import { DocsSections } from "@/components/docs-sections";
import { getMDXComponents } from "@/components/mdx";
import { neighbours, sectionsOf } from "@/lib/docs-tree";
import { pageMarkdown, source } from "@/lib/source";

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
    );
  }

  const MDX = page.data.body;
  return (
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
  return { title: page.data.title, description: page.data.description };
}
