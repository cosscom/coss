import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { getMarketingMDXComponents } from "@/components/marketing-mdx";
import {
  Faq,
  HeroActions,
  LinkGrid,
  MarketingClose,
  MarketingHero,
  Sheet,
} from "@/components/marketing-page";
import {
  marketingMarkdownUrl,
  productBySlug,
  SOLUTIONS_ROUTE,
  solutionBySlug,
  solutionPages,
} from "@/lib/marketing";
import { articleSchema, breadcrumbSchema, faqSchema, pageMetadata } from "@/lib/seo";

export default async function SolutionRoute({ params }: PageProps<"/solutions/[slug]">) {
  const { slug } = await params;
  const page = solutionBySlug(slug);
  if (!page) notFound();
  const { title, headline, description, mark, faq } = page.data;
  const products = page.data.products.flatMap((other) => {
    const product = productBySlug(other);
    return product ? [product] : [];
  });
  const MDX = page.data.body;
  return (
    <Sheet>
      <JsonLd data={articleSchema({ title: headline, description, path: page.url })} />
      <JsonLd
        data={breadcrumbSchema([
          ["Solutions", SOLUTIONS_ROUTE],
          [title, page.url],
        ])}
      />
      {faq.length ? <JsonLd data={faqSchema(faq)} /> : null}
      <MarketingHero
        actions={<HeroActions docs={products[0]?.data.docs ?? "/docs"} />}
        call="coss.com"
        headline={headline}
        lede={<p>{description}</p>}
        mark={mark}
      />
      <MDX components={getMarketingMDXComponents()} />
      <Faq faq={faq} />
      <LinkGrid
        id="products-title"
        links={products.map((product) => ({
          href: product.url,
          title: product.data.title,
          description: product.data.description ?? "",
          mark: product.data.mark,
          call: product.data.call,
        }))}
        title="The products"
        lede="One key, one SDK, one log for all of them."
      />
      <MarketingClose title="Build it this afternoon.">
        <p>Hand your coding agent this prompt, then pick the parts you need:</p>
      </MarketingClose>
    </Sheet>
  );
}

export function generateStaticParams() {
  return solutionPages().map((page) => ({ slug: page.slugs[0] ?? "" }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/solutions/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = solutionBySlug(slug);
  if (!page) notFound();
  return pageMetadata({
    title: page.data.seoTitle,
    description: page.data.description ?? "",
    path: page.url,
    type: "article",
    markdown: marketingMarkdownUrl(page.url),
    ownImage: true,
  });
}
