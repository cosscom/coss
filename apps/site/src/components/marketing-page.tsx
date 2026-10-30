import { Button } from "@coss/ui/components/button";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Mark } from "@/lib/marks";
import { CopyPrompt } from "./home/copy-prompt";
import { PartDrawing } from "./home/part-drawing";
import { SectionHead } from "./sheet";
import { SignUpButton } from "./sign-up-button";

/*
 * The frame of the product, solution and comparison pages: one ruled sheet like the landing
 * page (DESIGN.md), opened by a hero with the product's block and closed by a call to action.
 * Their copy lives in content/products, content/solutions and src/lib/compare.ts.
 */

/** The page's sheet, between the shell's rails. */
export function Sheet({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-[1440px] flex-1">{children}</main>;
}

/** The hero: the h1 and its lede with the actions, and the product's block on the drafting grid. */
export function MarketingHero({
  headline,
  lede,
  mark,
  call,
  actions,
}: {
  headline: string;
  lede: ReactNode;
  mark: Mark;
  call: string;
  actions?: ReactNode;
}) {
  return (
    <section aria-labelledby="hero-title" className="grid grid-cols-1 border-b lg:grid-cols-12">
      <div className="flex flex-col gap-8 px-4 pt-12 pb-10 sm:px-8 sm:pt-16 lg:col-span-7 lg:justify-end lg:border-r lg:pb-12">
        <h1
          className="text-balance font-semibold text-[clamp(2.5rem,5.5vw,4.5rem)] leading-[0.95] tracking-[-0.035em]"
          id="hero-title"
        >
          {headline}
        </h1>
        <div className="flex flex-col gap-6">
          <div className="max-w-xl text-lg text-muted-foreground leading-snug">{lede}</div>
          <div className="flex flex-wrap gap-2.5">{actions}</div>
        </div>
      </div>
      <div className="drafting-grid flex min-h-64 items-center justify-center border-t px-4 py-12 lg:col-span-5 lg:border-t-0">
        <PartDrawing call={call} className="w-56 sm:w-64" part={mark} />
      </div>
    </section>
  );
}

/** The usual hero actions: sign up, then the guide. */
export function HeroActions({
  docs,
  docsLabel = "Read the docs",
}: {
  docs: string;
  docsLabel?: string;
}) {
  return (
    <>
      <SignUpButton />
      <Button className="px-4" render={<Link href={docs} />} variant="outline">
        {docsLabel}
      </Button>
    </>
  );
}

/** The FAQ, every answer on the page (crawlers and answer engines read what's rendered). */
export function Faq({ faq }: { faq: readonly { question: string; answer: string }[] }) {
  if (!faq.length) return null;
  return (
    <section aria-labelledby="faq-title" className="scroll-mt-14 border-b" id="faq">
      <SectionHead id="faq-title" title="Questions" />
      <dl className="border-t">
        {faq.map(({ question, answer }) => (
          <div
            className="grid gap-3 border-b px-4 py-8 last:border-b-0 sm:px-8 lg:grid-cols-12 lg:gap-10"
            key={question}
          >
            <dt className="font-semibold text-xl tracking-[-0.01em] lg:col-span-5">{question}</dt>
            <dd className="max-w-2xl text-muted-foreground leading-snug lg:col-span-7">{answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export interface CardLink {
  href: string;
  title: string;
  description: string;
  mark?: Mark;
  call?: string;
}

/** Ruled cards linking onward: related products, comparisons, solutions. */
export function LinkGrid({
  id,
  title,
  lede,
  links,
}: {
  id: string;
  title: string;
  lede?: ReactNode;
  links: readonly CardLink[];
}) {
  if (!links.length) return null;
  return (
    <section aria-labelledby={id} className="border-b">
      <SectionHead id={id} title={title}>
        {lede}
      </SectionHead>
      <RuledGrid>
        {links.map((link) => (
          <li key={link.href}>
            <Link
              className="group flex h-full items-center gap-5 px-4 py-6 sm:px-8"
              href={link.href}
            >
              {link.mark && link.call ? (
                <PartDrawing call={link.call} className="w-20 shrink-0" part={link.mark} />
              ) : null}
              <span className="flex min-w-0 flex-col gap-1">
                <span className="flex items-center gap-1.5 font-semibold text-lg tracking-[-0.01em]">
                  <span className="group-hover:underline">{link.title}</span>
                  <ArrowRightIcon
                    aria-hidden
                    className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
                <span className="text-muted-foreground text-sm leading-snug">
                  {link.description}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </RuledGrid>
    </section>
  );
}

/**
 * Cells ruled by hairlines, never gaps (DESIGN.md): every cell draws its right and bottom rule,
 * and the frame clips the outer ones.
 */
export function RuledGrid({ columns = 3, children }: { columns?: 2 | 3; children: ReactNode }) {
  return (
    <div className="overflow-hidden border-t">
      <ul
        className={`-mb-px grid grid-cols-1 sm:-mr-px sm:grid-cols-2 [&>li]:border-b sm:[&>li]:border-r ${
          columns === 3 ? "lg:grid-cols-3" : ""
        }`}
      >
        {children}
      </ul>
    </div>
  );
}

/** The closing call to action: the agent prompt and sign-up, on the drafting grid. */
export function MarketingClose({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section aria-labelledby="close-title" className="drafting-grid px-4 py-20 sm:px-8 sm:py-24">
      <div className="flex flex-col items-start gap-8">
        <h2
          className="max-w-4xl text-balance font-semibold text-[clamp(2.25rem,5vw,4rem)] leading-[0.95] tracking-[-0.035em]"
          id="close-title"
        >
          {title}
        </h2>
        {children ? <div className="max-w-xl text-lg text-muted-foreground">{children}</div> : null}
        <div className="w-full max-w-3xl">
          <CopyPrompt />
        </div>
        <div className="flex flex-wrap gap-2.5">
          <SignUpButton size="lg" />
          <Button className="px-5" render={<Link href="/pricing" />} size="lg" variant="outline">
            Pricing
          </Button>
        </div>
      </div>
    </section>
  );
}
