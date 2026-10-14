import { Button } from "@coss/ui/components/button";
import { cn } from "@coss/ui/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";
import { InstallCta } from "@/components/calendar/landing/plan-copy";
import { Reveal } from "@/components/calendar/landing/reveal";
import { PageHero } from "@/components/calendar/site/page-hero";
import { Section, SectionHead } from "@/components/calendar/site/section";
import { TOOLS, type Tool } from "@/lib/calendar/tools";

export function ToolShell({ tool, children }: { tool: Tool; children: ReactNode }) {
  const others = TOOLS.filter((t) => t.slug !== tool.slug);

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex flex-1 flex-col">
        <PageHero
          size="sm"
          eyebrow={[
            <Link key="tools" href="/kloq/tools" className="rounded-xs hover:text-foreground">
              tools
            </Link>,
            <span key="free" className="text-foreground">
              free
            </span>,
            "no account, nothing leaves your browser",
          ]}
          title={tool.name}
          lede={tool.lede}
        />

        <Section>{children}</Section>

        <Section>
          <Reveal>
            <SectionHead
              label="where this comes from"
              title="It is one function out of a calendar."
              lede={`This page runs ${tool.built} — the same code that ships in kloq, not a re-implementation. Every interaction in the calendar is built to this standard, which is the whole pitch.`}
            />
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button render={<Link href={tool.docs} />}>Read the docs</Button>
              <Button variant="outline" render={<Link href="/kloq/demo" />}>
                Try the calendar
              </Button>
              <InstallCta variant="ghost" />
            </div>
          </Reveal>
        </Section>

        <Section>
          <Reveal>
            <SectionHead label="also free" title="The other four." />
          </Reveal>
          <ToolLinks tools={others} className="mt-10 sm:grid-cols-2" />
        </Section>
      </main>
    </div>
  );
}

/** A ruled grid of tool cards. The focus ring is inset because the frame clips its corners. */
export function ToolLinks({
  tools,
  className,
  children,
}: {
  tools: Tool[];
  className?: string;
  children?: (tool: Tool) => ReactNode;
}) {
  return (
    <ul className={cn("grid gap-px overflow-hidden rounded-xl border bg-border", className)}>
      {tools.map((tool) => (
        <li key={tool.slug} className="flex bg-card sm:last:odd:col-span-2">
          <Link
            href={`/kloq/tools/${tool.slug}`}
            className="group flex flex-1 flex-col gap-2 p-6 -outline-offset-2 transition-colors hover:bg-accent"
          >
            {children ? (
              children(tool)
            ) : (
              <>
                <h3 className="font-heading text-lg font-semibold tracking-tight text-balance">
                  {tool.name}
                </h3>
                <p className="text-pretty text-sm text-muted-foreground">{tool.detail}</p>
              </>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
