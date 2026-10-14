import { type NavItem, SITE_URL } from "./site.ts";

/**
 * kloq (the `cosscom/calendar` repository) at coss.com/kloq: its landing page, live demo,
 * tools, comparisons, docs and shadcn registry, moved here from kloq.dev (where the app was built
 * to be served below `/calendar`). The library itself is the `kloq` workspace
 * package (packages/kloq).
 */
export const CALENDAR = {
  name: "kloq",
  /** The library's name, as the docs and the registry call it. */
  library: "kloq",
  path: "/kloq",
  url: `${SITE_URL}/calendar`,
  title: "kloq - a React calendar obsessed with micro-perfection",
  description:
    "A React calendar obsessed with micro-perfection: hand-tuned drag physics, a design mode that annotates its own craft, and a command palette that reaches everything. One component, on coss ui.",
  githubRepo: "cosscom/calendar",
  github: "https://github.com/cosscom/calendar",
  /** The docs (content/calendar, src/lib/calendar-docs.ts) and their own search index. */
  docs: "/kloq/docs",
  demo: "/kloq/demo",
  tools: "/kloq/tools",
  compare: "/kloq/compare",
  searchApi: "/kloq/docs/search.json",
} as const;

/**
 * Header links of kloq's pages: the demo (its own page without the site's header,
 * so it opens in a new tab), the docs, the tools and the comparisons.
 */
export const CALENDAR_LINKS: readonly NavItem[] = [
  { label: "Demo", href: CALENDAR.demo, external: true },
  { label: "Docs", href: CALENDAR.docs },
  { label: "Tools", href: CALENDAR.tools },
  { label: "Compare", href: CALENDAR.compare },
];
