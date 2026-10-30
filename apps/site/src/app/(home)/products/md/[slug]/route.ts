import { notFound } from "next/navigation";
import { markdownText, marketingMarkdown, productBySlug, productPages } from "@/lib/marketing";

// `/products/<slug>.md` is rewritten here (next.config.ts).
export const revalidate = false;
export const dynamicParams = false;

export async function GET(_request: Request, { params }: RouteContext<"/products/md/[slug]">) {
  const page = productBySlug((await params).slug);
  if (!page) notFound();
  return markdownText(await marketingMarkdown(page));
}

export function generateStaticParams() {
  return productPages().map((page) => ({ slug: page.slugs[0] ?? "" }));
}
