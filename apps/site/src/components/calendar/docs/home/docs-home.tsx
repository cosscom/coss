import { Button } from "@coss/ui/components/button";
import { Kbd } from "@coss/ui/components/kbd";
import { cn } from "@coss/ui/lib/utils";
import type { Node, Root } from "fumadocs-core/page-tree";
import Link from "next/link";
import type { ReactNode } from "react";
import { CodePanes } from "@/components/calendar/site/code-panes";
import { highlight } from "@/components/calendar/site/highlight";
import { Mono } from "@/components/calendar/site/section";
import { TEXT_LINK } from "@/components/calendar/site/text-link";
import { calendarSource as source } from "@/lib/calendar-docs";
import { EXAMPLES, exampleBySlug } from "../examples/registry";
import { Card } from "../ui/card";
import { Code } from "../ui/inline-code";
import { Live } from "../ui/live-frame";
import { Chip, Eyebrow, Pin } from "../ui/pin";
import { CalendarSlot } from "./calendar-slot";

const TRY: ReactNode[] = [
  <>
    Drag an event somewhere else. The point you grabbed stays under the pointer — it never drifts.
  </>,
  <>Pull its bottom edge. The hit zone is 8 px, bigger than the pixels you can see.</>,
  <>
    Press <Kbd>Esc</Kbd> mid-drag. It springs home.
  </>,
  <>
    Click inside, then press <Kbd>?</Kbd>. About fifty keys, all on one sheet.
  </>,
];

const STEPS: {
  title: string;
  file: string;
  code: string;
  lang: string;
  command?: boolean;
  note: ReactNode;
  href: string;
  cta: string;
}[] = [
  {
    title: "Install",
    file: "terminal",
    code: "npm install kloq",
    lang: "bash",
    command: true,
    note: (
      <>
        React 19 and Tailwind v4 are assumed. Or land the whole calendar in your repo through the
        source registry.
      </>
    ),
    href: "/calendar/docs/installation",
    cta: "Installation",
  },
  {
    title: "Import the stylesheet once",
    file: "app/layout.tsx",
    code: `import "kloq/styles.css";`,
    lang: "tsx",
    note: (
      <>In the root layout — CSS imported inside a page or component only reaches that route.</>
    ),
    href: "/calendar/docs/installation#light-and-dark",
    cta: "Light and dark",
  },
  {
    title: "Give it a box",
    file: "app/page.tsx",
    code: `<div className="h-dvh">\n  <Kloq />\n</div>`,
    lang: "tsx",
    note: (
      <>
        <Code>{"<Kloq>"}</Code> is <Code>h-full</Code>. No height, no calendar — the one mistake
        everyone makes first.
      </>
    ),
    href: "/calendar/docs/quick-start",
    cta: "Quick start",
  },
];

const FEATURED = ["booking-page", "team-schedule", "server-sync", "custom-event-block"];

const FACTS: [string, string][] = [
  ["6", "views"],
  ["19", "themes"],
  ["~50", "keys"],
  ["0", "React renders per drag frame"],
  ["5", "npm deps"],
  ["React", "19"],
  ["Tailwind", "v4"],
];

type Page = { name: ReactNode; url: string; description?: ReactNode };
type Group = { name: ReactNode; pages: Page[] };

function groupsOf(tree: Root): Group[] {
  const groups: Group[] = [];
  let current: Group | undefined;
  const visit = (node: Node) => {
    if (node.type === "separator") {
      current = { name: node.name, pages: [] };
      groups.push(current);
      return;
    }
    if (node.type === "folder") {
      if (node.index) visit(node.index);
      node.children.forEach(visit);
      return;
    }
    if (!current) {
      current = { name: "", pages: [] };
      groups.push(current);
    }
    current.pages.push({ name: node.name, url: node.url, description: node.description });
  };
  tree.children.forEach(visit);
  return groups.filter((g) => g.pages.length > 0);
}

const lower = (n: ReactNode) => (typeof n === "string" ? n.toLowerCase() : n);

function Section({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("py-12 sm:py-16", className)}>
      <Eyebrow>{label}</Eyebrow>
      {children}
    </section>
  );
}

export async function DocsHome() {
  const groups = groupsOf(source.getPageTree());
  const pageCount = groups.reduce((n, g) => n + g.pages.length, 0);
  const featured = FEATURED.map(exampleBySlug).filter((e) => e !== undefined);
  const steps = await Promise.all(
    STEPS.map(async (s) => ({ ...s, html: await highlight(s.code, s.lang) })),
  );

  return (
    <div className="@container not-prose divide-y">
      <section className="pb-12 sm:pb-16">
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
          <Button size="lg" render={<Link href="/calendar/docs/quick-start" />}>
            Quick start
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/calendar/docs/examples" />}>
            Examples
          </Button>
          <Button
            size="lg"
            variant="ghost"
            render={<Link href="/calendar/docs/playground" />}
            className="max-sm:col-span-2"
          >
            Playground
          </Button>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t py-3 font-mono text-xs text-muted-foreground">
          <Live />
          <span className="@max-xl:hidden">64 px / hour</span>
          <span className="@max-xl:hidden">snap 15 min</span>
          <span className="@xl:ml-auto">drag anything · nothing is saved</span>
        </div>
        <CalendarSlot />
        <ol
          aria-label="Things to try"
          className="mt-6 grid gap-x-8 gap-y-4 @xl:grid-cols-2 @4xl:grid-cols-4"
        >
          {TRY.map((t, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
              <Pin n={i + 1} className="mt-0.5" />
              <span className="text-pretty">{t}</span>
            </li>
          ))}
        </ol>
      </section>

      <Section label="start here">
        <h2 className="mt-4 font-heading text-2xl font-semibold tracking-tight">
          Three steps to a calendar.
        </h2>
        <ol className="mt-8 grid gap-x-8 gap-y-10 @3xl:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <Pin n={i + 1} />
                <h3 className="font-heading text-lg font-semibold tracking-tight">{s.title}</h3>
              </div>
              <CodePanes
                className="mt-4"
                panes={[{ title: s.file, code: s.code, html: s.html, command: s.command }]}
              />
              <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
                {s.note}
              </p>
              <p className="mt-auto pt-3 text-sm">
                <Link href={s.href} className={TEXT_LINK}>
                  {s.cta} →
                </Link>
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <Section label="the map">
        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Seven sections. Every page.
          </h2>
          <Mono>
            {groups.length} sections · {pageCount} pages · <Kbd>⌘</Kbd>
            <Kbd>K</Kbd> searches all of them
          </Mono>
        </div>
        <ol className="mt-6 divide-y border-t">
          {groups.map((g, gi) => (
            <li
              key={gi}
              className="grid gap-x-8 gap-y-3 py-6 @2xl:grid-cols-[9rem_1fr] @5xl:grid-cols-[11rem_1fr]"
            >
              <div>
                <Eyebrow index={String(gi + 1).padStart(2, "0")}>{lower(g.name)}</Eyebrow>
                <Mono className="mt-1.5 block tabular-nums">
                  {g.pages.length} {g.pages.length === 1 ? "page" : "pages"}
                </Mono>
              </div>
              <ul className="grid gap-x-6 gap-y-2 @xl:grid-cols-2 @xl:gap-y-3 @5xl:grid-cols-3">
                {g.pages.map((p) => (
                  <li key={p.url} className="min-w-0">
                    {p.url === "/calendar/docs" ? (
                      <span className="flex items-baseline gap-2 text-sm">
                        <span className="text-muted-foreground">{p.name}</span>
                        <span className="font-mono text-xs text-brand-foreground">
                          you are here
                        </span>
                      </span>
                    ) : (
                      <Link
                        href={p.url}
                        className="group block text-sm text-foreground underline decoration-transparent underline-offset-4 transition-colors hover:decoration-foreground"
                      >
                        {p.name}
                      </Link>
                    )}
                    {p.description != null && (
                      <span className="mt-0.5 line-clamp-2 text-pretty text-xs leading-relaxed text-muted-foreground @max-xl:hidden">
                        {p.description}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Section>

      <Section label="examples">
        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            The real component, with its source beside it.
          </h2>
          <Link href="/calendar/docs/examples" className={cn(TEXT_LINK, "text-sm")}>
            All {EXAMPLES.length} examples →
          </Link>
        </div>
        <ul className="mt-6 grid gap-4 @xl:grid-cols-2 @5xl:grid-cols-4">
          {featured.map((e) => (
            <li key={e.slug}>
              <Card
                href={`/calendar/docs/examples/${e.slug}`}
                title={e.title}
                description={e.description}
              >
                {e.uses.slice(0, 3).map((u) => (
                  <Chip key={u}>{u}</Chip>
                ))}
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      <Section label="facts" className="pb-4 sm:pb-8">
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs text-muted-foreground">
          {FACTS.map(([n, label]) => (
            <li key={label} className="flex items-baseline gap-1.5">
              <span className="text-foreground tabular-nums">{n}</span>
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
