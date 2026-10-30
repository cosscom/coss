import { notFound } from "next/navigation";
import { markdownText, marketingMarkdown, solutionBySlug, solutionPages } from "@/lib/marketing";

// `/solutions/<slug>.md` is rewritten here (next.config.ts).
export const revalidate = false;
export const dynamicParams = false;

export async function GET(_request: Request, { params }: RouteContext<"/solutions/md/[slug]">) {
  const page = solutionBySlug((await params).slug);
  if (!page) notFound();
  return markdownText(await marketingMarkdown(page));
}

export function generateStaticParams() {
  return solutionPages().map((page) => ({ slug: page.slugs[0] ?? "" }));
}
