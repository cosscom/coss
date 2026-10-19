import Link from "next/link";
import type { DocsSection, NavPage } from "@/lib/docs-tree";
import { SectionIcon } from "./section-icon";

/**
 * `<DocsSections />` on the docs' home page: every section with what it covers and where its parts
 * start (its labelled groups, else its pages), one ruled row each. Built from the page tree, so it
 * lists exactly what the sidebar does.
 */
export function DocsSections({ sections, current }: { sections: DocsSection[]; current: string }) {
  return (
    <div className="not-prose my-8 border-border/64 border-t">
      {sections.map((section) => (
        <section
          className="grid gap-x-8 gap-y-3 border-border/64 border-b py-5 sm:grid-cols-2"
          key={section.key}
        >
          <div className="flex flex-col gap-1">
            <Link
              className="flex items-center gap-2 font-medium text-foreground hover:underline hover:underline-offset-4"
              href={section.url}
            >
              <SectionIcon className="size-4 shrink-0 text-muted-foreground" name={section.icon} />
              {section.name}
            </Link>
            {section.description && (
              <p className="text-muted-foreground text-sm leading-relaxed">{section.description}</p>
            )}
          </div>
          <ul className="flex flex-wrap content-start gap-x-4 gap-y-1.5 text-sm">
            {sectionParts(section)
              .filter((part) => part.url !== current)
              .map((part) => (
                <li key={part.url}>
                  <Link
                    className="text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
                    href={part.url}
                  >
                    {part.name}
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Where a section's parts start: its labelled groups, else (one plain list) its pages. */
export function sectionParts(section: DocsSection): NavPage[] {
  const labelled = section.groups.filter((group) => group.label && group.pages[0]);
  if (labelled.length === 0) return section.groups.flatMap((group) => group.pages);
  return labelled.map((group) => ({ name: group.label, url: group.pages[0]?.url ?? "" }));
}

/** `<DocsSections />` as Markdown, for /llms*.txt and "Copy Markdown". */
export function sectionsMarkdown(sections: DocsSection[]): string {
  return sections
    .map((section) => {
      const parts = sectionParts(section)
        .map((part) => `[${String(part.name)}](${part.url})`)
        .join(", ");
      return `- [${String(section.name)}](${section.url}): ${String(section.description ?? "")} ${parts}`;
    })
    .join("\n");
}
