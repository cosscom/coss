import { Button } from "@coss/ui/components/button";
import { cn } from "@coss/ui/lib/utils";
import { ArrowRight, Check, Minus, X } from "lucide-react";
import Link from "next/link";
import { InstallCta } from "@/components/calendar/landing/plan-copy";
import { Reveal } from "@/components/calendar/landing/reveal";
import { PageHero } from "@/components/calendar/site/page-hero";
import { Mono, Section, SectionHead } from "@/components/calendar/site/section";
import { TEXT_LINK } from "@/components/calendar/site/text-link";
import { CHECKED, type Competitor, sourcedFrom } from "@/lib/calendar/compare";
import {
  Panel,
  PanelCell,
  PanelGrid,
  RuledBody,
  RuledCell,
  RuledColumn,
  RuledHeader,
  RuledRow,
  RuledRowHead,
  RuledTable,
} from "./ruled";

function Verdict({ win, loss }: { win?: boolean; loss?: boolean }) {
  const [Icon, label, tone] = win
    ? ([Check, "kloq", "text-success-foreground"] as const)
    : loss
      ? ([X, "them", "text-warning-foreground"] as const)
      : ([Minus, "even", "text-muted-foreground"] as const);
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-xs", tone)}>
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>
        <Mono>{label}</Mono>
      </dt>
      <dd className="mt-1 font-heading text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function Choices({ items }: { items: Competitor["chooseThem"] }) {
  return (
    <Reveal delay={80} className="mt-12">
      <PanelGrid className="sm:grid-cols-2">
        {items.map((item) => (
          <PanelCell key={item.title}>
            <h3 className="font-heading text-lg font-semibold tracking-tight text-balance">
              {item.title}
            </h3>
            <p className="mt-2 text-pretty text-sm text-muted-foreground">{item.body}</p>
          </PanelCell>
        ))}
      </PanelGrid>
    </Reveal>
  );
}

/** A column's name, shown inside the cell once the header row is gone on a phone. */
function CellLabel({ children }: { children: string }) {
  return (
    <span aria-hidden className="mb-1 block font-mono text-xs text-muted-foreground md:hidden">
      {children}
    </span>
  );
}

/** Restacked, both answers share one label row and one answer row, however a label wraps. */
const ANSWER = "wrap-anywhere max-md:row-span-2 max-md:grid max-md:grid-rows-subgrid";

/** The section that says when to pick them comes before the one that says when to pick kloq. */
export function ComparePage({ competitor: c }: { competitor: Competitor }) {
  const wins = c.rows.filter((r) => r.win).length;
  const losses = c.rows.filter((r) => r.loss).length;

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex flex-1 flex-col">
        <PageHero
          size="sm"
          eyebrow={[
            <Link
              key="compare"
              href="/kloq/compare"
              className="-my-1 inline-block py-1 hover:text-foreground"
            >
              compare
            </Link>,
            <span key="pair" className="text-foreground">
              kloq vs {c.name}
            </span>,
            `checked ${CHECKED}`,
          ]}
          title={c.verdict}
          lede={c.lede}
          aside={
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Stat label={c.pkg} value={`v${c.version}`} />
              <Stat label="npm, last week" value={c.downloads.toLocaleString("en-US")} />
              <Stat label="rows kloq wins" value={String(wins)} />
              <Stat label="rows kloq loses" value={String(losses)} />
            </dl>
          }
        />

        <Section>
          <Reveal>
            <SectionHead
              index="01"
              label="side by side"
              title="The table, with the losses left in."
              lede={`Every number below was read from ${sourcedFrom(c)} on ${CHECKED}. Sources are at the foot of the page — check them.`}
            />
          </Reveal>
          <Reveal delay={80} className="mt-12">
            <RuledTable caption={`kloq and ${c.name}, side by side`} className="md:table-fixed">
              <RuledHeader className="max-md:sr-only">
                <RuledRow>
                  <RuledColumn className="md:w-1/3 xl:w-2/5">
                    <span className="sr-only">Compared</span>
                  </RuledColumn>
                  <RuledColumn className="md:w-1/4">kloq</RuledColumn>
                  <RuledColumn>{c.name}</RuledColumn>
                  <RuledColumn className="text-right md:w-28">verdict</RuledColumn>
                </RuledRow>
              </RuledHeader>
              <RuledBody>
                {c.rows.map((row) => (
                  <RuledRow key={row.label} className="max-md:grid max-md:grid-cols-2">
                    <RuledRowHead className="max-md:col-span-2">
                      <span className="block font-medium max-md:pr-20">{row.label}</span>
                      {row.note && (
                        <span className="mt-1 block text-xs text-muted-foreground">{row.note}</span>
                      )}
                    </RuledRowHead>
                    <RuledCell className={ANSWER}>
                      <CellLabel>kloq</CellLabel>
                      <span>{row.kloq}</span>
                    </RuledCell>
                    <RuledCell className={cn(ANSWER, !row.loss && "text-muted-foreground")}>
                      <CellLabel>{c.name}</CellLabel>
                      <span>{row.them}</span>
                    </RuledCell>
                    <RuledCell className="text-right max-md:absolute max-md:top-0 max-md:right-0">
                      <Verdict win={row.win} loss={row.loss} />
                    </RuledCell>
                  </RuledRow>
                ))}
              </RuledBody>
            </RuledTable>
          </Reveal>
        </Section>

        <Section>
          <Reveal>
            <SectionHead
              index="02"
              label={`choose ${c.name.toLowerCase()}`}
              title={<>When {c.name} is the right answer.</>}
              lede="Four cases where we would tell you to install theirs. If one of them is your case, stop reading — you have your answer and it isn't us."
            />
          </Reveal>
          <Choices items={c.chooseThem} />
        </Section>

        <Section>
          <Reveal>
            <SectionHead
              index="03"
              label="choose kloq"
              title="And when we would say ours."
              lede="The narrower case — but it is the one this whole library was built for."
            />
          </Reveal>
          <Choices items={c.chooseKloq} />
        </Section>

        <Section>
          <Reveal>
            <SectionHead
              index="04"
              label="migration"
              title={<>What moving off {c.name} looks like.</>}
              lede="Not a codemod — an honest sketch of which concept becomes which. Most of the work is deleting things."
            />
          </Reveal>
          <Reveal delay={80} className="mt-12">
            <Panel>
              {c.migration.map((step) => (
                <div
                  key={step.from}
                  className="grid gap-x-6 gap-y-3 border-b p-6 last:border-b-0 md:grid-cols-2"
                >
                  <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-3">
                    <code className="rounded-md border bg-background px-2 py-1 font-mono text-xs text-muted-foreground">
                      {step.from}
                    </code>
                    <ArrowRight
                      aria-hidden
                      className="size-3.5 shrink-0 text-brand-foreground max-md:ml-2 max-md:rotate-90"
                    />
                    <span className="sr-only">becomes</span>
                    <code className="rounded-md border bg-background px-2 py-1 font-mono text-xs text-foreground">
                      {step.to}
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.note}</p>
                </div>
              ))}
            </Panel>
          </Reveal>
        </Section>

        <Section>
          <Reveal>
            <SectionHead
              index="05"
              label="check us"
              title="Where these numbers came from."
              lede={`Read on ${CHECKED}. If something below has moved, the table is wrong and we would like to know.`}
            />
          </Reveal>
          <Reveal delay={80}>
            <ul className="mt-10 flex flex-col items-start gap-3">
              {c.sources.map((source) => (
                <li key={source.href}>
                  <a
                    href={source.href}
                    rel="nofollow noopener"
                    className={cn(TEXT_LINK, "font-mono text-sm")}
                  >
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-12 flex flex-wrap gap-3">
              <Button size="lg" render={<Link href="/kloq/demo" />}>
                Try the calendar
              </Button>
              <InstallCta size="lg" variant="outline" />
              <Button size="lg" variant="ghost" render={<Link href="/kloq/compare" />}>
                All comparisons
              </Button>
            </div>
          </Reveal>
        </Section>
      </main>
    </div>
  );
}
