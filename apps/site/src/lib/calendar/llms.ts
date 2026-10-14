import type * as PageTree from "fumadocs-core/page-tree";
import { type CalendarPage, calendarSource } from "../calendar-docs";

/**
 * The docs grouped by the `---Section---` separators in meta.json, in tree order — the same
 * grouping a reader sees in the sidebar, so llms.txt and the site can't tell different stories
 * about how the manual is organised.
 */
export function docsSections(): { label: string; pages: CalendarPage[] }[] {
  const out: { label: string; pages: CalendarPage[] }[] = [];
  let current = { label: "Overview", pages: [] as CalendarPage[] };
  out.push(current);

  const walk = (nodes: PageTree.Node[]) => {
    for (const node of nodes) {
      if (node.type === "separator") {
        current = { label: typeof node.name === "string" ? node.name : "", pages: [] };
        out.push(current);
      } else if (node.type === "page") {
        const page = calendarSource.getPageByHref(node.url)?.page;
        if (page) current.pages.push(page);
      } else {
        if (node.index) {
          const page = calendarSource.getPageByHref(node.index.url)?.page;
          if (page) current.pages.push(page);
        }
        walk(node.children);
      }
    }
  };
  walk(calendarSource.getPageTree().children);

  return out.filter((section) => section.pages.length > 0);
}
