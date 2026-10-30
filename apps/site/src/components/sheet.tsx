import { cn } from "@coss/ui/lib/utils";
import { CheckIcon } from "lucide-react";
import type { ReactNode } from "react";

/*
 * The parts catalog's building blocks (DESIGN.md): one ruled sheet, sections that close with
 * `border-b`, heads with the heading in columns 1–5 and the description in 7–12, spec rows with a
 * dotted leader, and check lists. The landing page and the product, solution and comparison pages
 * share them.
 */

/** A section's head: the heading in columns 1–5, the description in 7–12. No eyebrow. */
export function SectionHead({
  id,
  title,
  children,
  as: Heading = "h2",
}: {
  id: string;
  title: ReactNode;
  children?: ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <div className="grid gap-4 px-4 pt-16 pb-10 sm:px-8 sm:pt-24 lg:grid-cols-12 lg:gap-10">
      <Heading
        className="text-balance font-semibold text-4xl tracking-[-0.03em] sm:text-5xl lg:col-span-5"
        id={id}
      >
        {title}
      </Heading>
      {children ? (
        <div className="max-w-xl text-lg text-muted-foreground leading-snug lg:col-span-6 lg:col-start-7 lg:pt-2 [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_p+p]:mt-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** Spec rows, two columns from `md`: a label, a dotted leader and the measured value in mono. */
export function SpecList({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <dl className={cn("grid gap-x-16 border-t px-4 py-10 sm:px-8 md:grid-cols-2", className)}>
      {children}
    </dl>
  );
}

export function SpecRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 border-b py-3.5">
      <dt>{label}</dt>
      <span aria-hidden className="leader" />
      <dd className="text-right font-mono text-sm">{children}</dd>
    </div>
  );
}

/** A short list of features, each with a check. */
export function CheckList({
  items,
  className,
}: {
  items: readonly ReactNode[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-col gap-2 text-muted-foreground text-sm", className)}>
      {items.map((item, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a static list
        <li className="flex items-center gap-2.5" key={index}>
          <CheckIcon aria-hidden className="size-3.5 shrink-0 text-foreground" />
          {item}
        </li>
      ))}
    </ul>
  );
}
