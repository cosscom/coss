import { Card, CardFrame, CardPanel } from "@coss/ui/components/card";
import { ScrollArea } from "@coss/ui/components/scroll-area";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { OpenAPIPage } from "@/components/api-page";
import { DocsCopyPage } from "@/components/docs-copy-page";
import { DocsTableOfContents } from "@/components/docs-toc";
import { getMDXComponents } from "@/components/mdx";
import { DocsFooter } from "@/components/site-footer";
import { pageMarkdown, source } from "@/lib/source";

export default async function Page({ params }: PageProps<"/docs/[[...slug]]">) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const markdown = await pageMarkdown(page);
  const toc = page.data.toc;

  let body: ReactNode;
  if (page.type === "openapi") {
    // The operation renders its own description, in Fumadocs' prose styling.
    body = (
      <div className="prose max-w-none">
        <OpenAPIPage {...page.data.getOpenAPIPageProps()} />
      </div>
    );
  } else {
    const MDX = page.data.body;
    body = <MDX components={getMDXComponents()} />;
  }

  return (
    <div className="flex items-stretch xl:w-full" data-slot="docs">
      <div className="relative flex w-full min-w-0 flex-1 flex-col lg:mt-8 lg:mr-4 lg:mb-8">
        <CardFrame className="border-sidebar-border shadow-lg/5 max-lg:border-none dark:bg-background">
          <Card className="max-lg:rounded-none! dark:bg-background max-lg:[clip-path:none]!">
            <CardPanel className="px-4 py-6 sm:px-6 lg:p-8">
              <div className="mx-auto w-full max-w-3xl">
                <div className="flex min-w-0 flex-col gap-8">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-2">
                      <h1 className="scroll-m-20 font-bold font-heading text-3xl xl:text-4xl">
                        {page.data.title}
                      </h1>
                      {page.type !== "openapi" && page.data.description && (
                        <p className="text-muted-foreground sm:text-lg">{page.data.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 pt-4">
                      <DocsCopyPage page={markdown} />
                    </div>
                  </div>
                  <div className="w-full flex-1 *:data-[slot=alert]:first:mt-0">{body}</div>
                </div>
              </div>
            </CardPanel>
          </Card>
          <div className="px-4 py-6 lg:rounded-b-2xl lg:px-8">
            <DocsFooter />
          </div>
        </CardFrame>
      </div>
      <div className="sticky top-(--header-height) z-30 ms-auto hidden h-[calc(100svh-var(--header-height))] w-72 flex-col overflow-hidden overscroll-none xl:flex">
        <ScrollArea
          className="**:data-[slot=scroll-area-scrollbar]:hidden"
          overscrollContain
          scrollFade
        >
          <div className="flex min-h-0 flex-col gap-2 py-2">
            <div className="h-(--top-spacing) shrink-0" />
            {toc.length > 0 && <DocsTableOfContents toc={toc} />}
          </div>
        </ScrollArea>
      </div>
    </div>
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
