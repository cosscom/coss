import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCalendarMDXComponents } from "@/components/calendar/docs/mdx";
import { DocsPageFrame } from "@/components/docs-frame";
import { CALENDAR } from "@/lib/calendar";
import { calendarPageMarkdown, calendarSource } from "@/lib/calendar-docs";
import { neighbours } from "@/lib/docs-tree";

export default async function Page({ params }: PageProps<"/kloq/docs/[[...slug]]">) {
  const { slug } = await params;
  const page = calendarSource.getPage(slug);
  if (!page) notFound();

  const MDX = page.data.body;
  return (
    <DocsPageFrame
      description={page.data.description}
      markdown={await calendarPageMarkdown(page)}
      neighbours={neighbours(calendarSource.getPageTree(), page.url)}
      title={page.data.title}
      toc={page.data.toc}
    >
      <MDX components={getCalendarMDXComponents()} />
    </DocsPageFrame>
  );
}

export function generateStaticParams() {
  return calendarSource.generateParams();
}

// Every page is prerendered: anything else is a 404 straight away (see /docs).
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/kloq/docs/[[...slug]]">): Promise<Metadata> {
  const { slug } = await params;
  const page = calendarSource.getPage(slug);
  if (!page) notFound();
  return {
    title: { absolute: `${page.data.title} · ${CALENDAR.name} docs` },
    description: page.data.description,
  };
}
