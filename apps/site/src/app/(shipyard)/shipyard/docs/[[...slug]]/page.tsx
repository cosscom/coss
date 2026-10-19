import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsPageFrame } from "@/components/docs-frame";
import { getShipyardMDXComponents } from "@/components/shipyard/docs/mdx";
import { neighbours } from "@/lib/docs-tree";
import { SHIPYARD } from "@/lib/shipyard";
import { shipyardSource } from "@/lib/shipyard-docs";

export default async function Page({ params }: PageProps<"/shipyard/docs/[[...slug]]">) {
  const { slug } = await params;
  const page = shipyardSource.getPage(slug);
  if (!page) notFound();

  const markdown = `# ${page.data.title} (${page.url})\n\n${await page.data.getText("processed")}`;
  const MDX = page.data.body;
  return (
    <DocsPageFrame
      description={page.data.description}
      markdown={markdown}
      neighbours={neighbours(shipyardSource.getPageTree(), page.url)}
      title={page.data.title}
      toc={page.data.toc}
    >
      <MDX components={getShipyardMDXComponents()} />
    </DocsPageFrame>
  );
}

export function generateStaticParams() {
  return shipyardSource.generateParams();
}

// Every page is prerendered: anything else is a 404 straight away (see /docs).
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/shipyard/docs/[[...slug]]">): Promise<Metadata> {
  const { slug } = await params;
  const page = shipyardSource.getPage(slug);
  if (!page) notFound();
  return {
    title: { absolute: `${page.data.title} · ${SHIPYARD.name} docs` },
    description: page.data.description,
  };
}
