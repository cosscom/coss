import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getShipyardMDXComponents } from "@/components/shipyard/docs/mdx";
import { SHIPYARD } from "@/lib/shipyard";
import { shipyardSource } from "@/lib/shipyard-docs";

export default async function Page({ params }: PageProps<"/shipyard/docs/[[...slug]]">) {
  const { slug } = await params;
  const page = shipyardSource.getPage(slug);
  if (!page) notFound();

  const MDX = page.data.body;
  return (
    <DocsPage full={page.data.full} toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={getShipyardMDXComponents()} />
      </DocsBody>
    </DocsPage>
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
