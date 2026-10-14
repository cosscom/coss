import { type NavItem, SITE_URL } from "./site.ts";

/**
 * The Calendar UI kit (coss calendar, the `cosscom/calendar` repository) at coss.com/calendar: its landing
 * page, live demo, tools, comparisons, docs and shadcn registry, moved here from coss.com/calendar (where
 * the app was built to be served below `/calendar`). The library itself is the `kloq` workspace
 * package (packages/kloq).
 */
export const CALENDAR = {
  name: "Calendar UI kit",
  /** The library's name, as the docs and the registry call it. */
  library: "kloq",
  path: "/calendar",
  url: `${SITE_URL}/calendar`,
  title: "Calendar UI kit - a React calendar obsessed with micro-perfection",
  description:
    "A React calendar obsessed with micro-perfection: hand-tuned drag physics, a design mode that annotates its own craft, and a command palette that reaches everything. One component, on coss ui.",
  githubRepo: "cosscom/calendar",
  github: "https://github.com/cosscom/calendar",
  /** The docs (content/calendar, src/lib/calendar-docs.ts) and their own search index. */
  docs: "/calendar/docs",
  demo: "/calendar/demo",
  tools: "/calendar/tools",
  compare: "/calendar/compare",
  searchApi: "/calendar/docs/search.json",
} as const;

/**
 * Header links of the Calendar UI kit's pages: the demo (its own page without the site's header,
 * so it opens in a new tab), the docs, the tools and the comparisons.
 */
export const CALENDAR_LINKS: readonly NavItem[] = [
  { label: "Demo", href: CALENDAR.demo, external: true },
  { label: "Docs", href: CALENDAR.docs },
  { label: "Tools", href: CALENDAR.tools },
  { label: "Compare", href: CALENDAR.compare },
];
