import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComparePage } from "@/components/compare/compare-page";
import { COMPARE_ROUTE, COMPETITORS, competitorBySlug } from "@/lib/compare";
import { pageMetadata } from "@/lib/seo";

export default async function CompareRoute({ params }: PageProps<"/compare/[slug]">) {
  const { slug } = await params;
  const competitor = competitorBySlug(slug);
  if (!competitor) notFound();
  return <ComparePage competitor={competitor} url={`${COMPARE_ROUTE}/${slug}`} />;
}

export function generateStaticParams() {
  return COMPETITORS.map((competitor) => ({ slug: competitor.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/compare/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const competitor = competitorBySlug(slug);
  if (!competitor) notFound();
  const path = `${COMPARE_ROUTE}/${slug}`;
  return pageMetadata({
    title: `coss.com vs ${competitor.name}: ${competitor.query}`,
    description: competitor.verdict,
    path,
    type: "article",
    markdown: `${path}.md`,
  });
}
