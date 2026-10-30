import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { getMarketingMDXComponents } from "@/components/marketing-mdx";
import {
  type CardLink,
  Faq,
  HeroActions,
  LinkGrid,
  MarketingClose,
  MarketingHero,
  Sheet,
} from "@/components/marketing-page";
import { COMPARE_ROUTE, competitorsFor } from "@/lib/compare";
import {
  marketingMarkdownUrl,
  type ProductPage,
  productBySlug,
  productPages,
  solutionPages,
} from "@/lib/marketing";
import { breadcrumbSchema, faqSchema, pageMetadata, productSchema } from "@/lib/seo";

export default async function ProductRoute({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const page = productBySlug(slug);
  if (!page) notFound();
  const { title, headline, description, call, mark, docs, features, faq } = page.data;
  const MDX = page.data.body;
  return (
    <Sheet>
      <JsonLd
        data={productSchema({
          name: title,
          description: description ?? "",
          path: page.url,
          features,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          ["Products", "/products"],
          [title, page.url],
        ])}
      />
      {faq.length ? <JsonLd data={faqSchema(faq)} /> : null}
      <MarketingHero
        actions={<HeroActions docs={docs} />}
        call={call}
        headline={headline}
        lede={<p>{description}</p>}
        mark={mark}
      />
      <MDX components={getMarketingMDXComponents()} />
      <Faq faq={faq} />
      <LinkGrid
        id="related-title"
        links={related(page)}
        title="Works with"
        lede="On the same key, SDK, webhooks and logs: nothing more to set up."
      />
      <LinkGrid
        id="compare-title"
        links={competitorsFor(slug).map((c) => ({
          href: `${COMPARE_ROUTE}/${c.slug}`,
          title: `coss.com vs ${c.name}`,
          description: c.verdict,
        }))}
        title="Compared"
        lede="How it stacks up against the services you may be using, with sources."
      />
      <MarketingClose title={`Start with ${title} today.`}>
        <p>
          Development keys record every request and event and deliver nothing, so you can build and
          test before you verify a domain. Hand your coding agent this prompt:
        </p>
      </MarketingClose>
    </Sheet>
  );
}

/** The related products, then the solutions that use this one. */
function related(page: ProductPage): CardLink[] {
  const slug = page.slugs[0] ?? "";
  const products = page.data.related.flatMap((other) => {
    const product = productBySlug(other);
    return product
      ? [
          {
            href: product.url,
            title: product.data.title,
            description: product.data.description ?? "",
            mark: product.data.mark,
            call: product.data.call,
          },
        ]
      : [];
  });
  const solutions = solutionPages()
    .filter((solution) => solution.data.products.includes(slug))
    .map((solution) => ({
      href: solution.url,
      title: solution.data.title,
      description: solution.data.description ?? "",
    }));
  return [...products, ...solutions];
}

export function generateStaticParams() {
  return productPages().map((page) => ({ slug: page.slugs[0] ?? "" }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = productBySlug(slug);
  if (!page) notFound();
  return pageMetadata({
    title: page.data.seoTitle,
    description: page.data.description ?? "",
    path: page.url,
    markdown: marketingMarkdownUrl(page.url),
    ownImage: true,
  });
}
