import type { MDXComponents } from "mdx/types";
import { Children, isValidElement, type ReactNode } from "react";
import { getMDXComponents } from "./mdx";
import { SectionHead, SpecList, SpecRow } from "./sheet";

/*
 * The sheet components the product and solution pages are written with (content/products,
 * content/solutions). They lay MDX out on the catalog's ruled sheet (DESIGN.md): every
 * `<Section>` is a ruled section with its head, `<Features>` a grid of ruled cells, `<Specs>`
 * spec rows with leaders; any other Markdown in a section (paragraphs, code, tables) is set as
 * prose. `renderSheetComponents` (src/lib/marketing.ts) turns them into Markdown for agents:
 * keep the two in step.
 */

/** Slugifies a section title into its anchor ("How it works" → `how-it-works`). */
function anchor(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** A ruled section: the head (title, lede), then its blocks. */
export function Section({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children?: ReactNode;
}) {
  const id = anchor(title);
  // Consecutive Markdown children (paragraphs, code, lists) are one prose block; the sheet's own
  // blocks (features, specs) span the section.
  const blocks: ReactNode[] = [];
  let prose: ReactNode[] = [];
  const flush = () => {
    if (!prose.length) return;
    blocks.push(
      <div
        className="prose min-w-0 max-w-none border-t px-4 py-10 sm:px-8 lg:grid lg:grid-cols-12 lg:gap-10 [&>*]:lg:col-span-8 [&>*]:lg:col-start-5"
        key={`prose-${blocks.length}`}
      >
        {prose}
      </div>,
    );
    prose = [];
  };
  Children.forEach(children, (child) => {
    if (isValidElement(child) && (child.type === Features || child.type === Specs)) {
      flush();
      blocks.push(child);
    } else if (child !== null && child !== undefined && child !== "\n") {
      prose.push(child);
    }
  });
  flush();
  return (
    <section aria-labelledby={id} className="scroll-mt-14 border-b" id={`section-${id}`}>
      <SectionHead id={id} title={title}>
        {lede ? <p>{lede}</p> : null}
      </SectionHead>
      {blocks}
    </section>
  );
}

/** A grid of ruled cells, two or three across. */
export function Features({ children }: { children: ReactNode }) {
  const count = Children.toArray(children).filter(isValidElement).length;
  // Cells draw their right and bottom rules; the frame clips the outer ones.
  return (
    <div className="overflow-hidden border-t">
      <div
        className={`-mb-px grid grid-cols-1 md:-mr-px md:grid-cols-2 [&>*]:border-b md:[&>*]:border-r ${
          count % 3 === 0 ? "lg:grid-cols-3" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/** One cell of `<Features>`: a short title and a few sentences. */
export function Feature({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-4 py-8 sm:px-8">
      <h3 className="font-semibold text-xl tracking-[-0.01em]">{title}</h3>
      <div className="text-muted-foreground leading-snug [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_code]:font-mono [&_code]:text-[0.8125rem] [&_code]:text-foreground [&_p+p]:mt-2">
        {children}
      </div>
    </div>
  );
}

/** Spec rows: `<Spec label="Batch send">100 emails</Spec>`, copied from the source. */
export function Specs({ children }: { children: ReactNode }) {
  return <SpecList>{children}</SpecList>;
}

export function Spec({ label, children }: { label: string; children: ReactNode }) {
  return <SpecRow label={label}>{children}</SpecRow>;
}

/** The site's MDX components plus the sheet's. */
export function getMarketingMDXComponents(components?: MDXComponents): MDXComponents {
  return getMDXComponents({ Section, Features, Feature, Specs, Spec, ...components });
}
