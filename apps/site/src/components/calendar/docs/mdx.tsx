import { Kbd } from "@coss/ui/components/kbd";
import { cn } from "@coss/ui/lib/utils";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";
import { getMDXComponents } from "@/components/mdx";
import { DocDemo } from "./doc-demo";
import { Example } from "./example";
import { ExampleGallery } from "./example-gallery";
import { DocsHome } from "./home/docs-home";
import { Playground } from "./playground";
import { PropsReference } from "./props-reference";
import { RegistryConfig, RegistryIndexUrl } from "./registry-urls";
import { ConstraintsDemo, QuickAddInputDemo } from "./ui/demos";
import { snippetPalette } from "./ui/snippet-palette";
import { TypeTable } from "./ui/type-table";

async function PlaygroundEntry(props: Omit<ComponentProps<typeof Playground>, "palette">) {
  return <Playground {...props} palette={await snippetPalette()} />;
}

/**
 * Components available in every Calendar UI docs page without an import: the site's (coss
 * ui's typography, callouts and cards, Fumadocs' code blocks), with coss.com/calendar's own pieces in
 * front — the live examples with their source, the playground, the props reference, the demos
 * and the docs home.
 */
export function getCalendarMDXComponents(components?: MDXComponents) {
  return getMDXComponents({
    ConstraintsDemo,
    DocDemo,
    DocsHome,
    Example,
    ExampleGallery,
    /* `not-prose` keeps the typography's kbd rule off the primitive */
    Kbd: (props: ComponentProps<typeof Kbd>) => (
      <Kbd {...props} className={cn("not-prose", props.className)} />
    ),
    Playground: PlaygroundEntry,
    PropsReference,
    QuickAddInputDemo,
    RegistryConfig,
    RegistryIndexUrl,
    TypeTable,
    ...components,
  });
}
