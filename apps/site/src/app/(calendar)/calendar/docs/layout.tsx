import { DocsLayoutFrame } from "@/components/docs-frame";
import { SiteShell } from "@/components/site-shell";
import { CALENDAR, CALENDAR_LINKS } from "@/lib/calendar";
import { calendarSource } from "@/lib/calendar-docs";

export default function Layout({ children }: LayoutProps<"/calendar/docs">) {
  // The same docs layout as /docs, over the Calendar UI kit's tree (its `---Sections---` are the
  // sidebar groups) and its own search index (/calendar/docs/search.json).
  const tree = calendarSource.getPageTree();
  return (
    <SiteShell
      github={{ repo: CALENDAR.githubRepo, href: CALENDAR.github }}
      items={CALENDAR_LINKS}
      searchApi={CALENDAR.searchApi}
      tree={tree}
    >
      <DocsLayoutFrame tree={tree}>{children}</DocsLayoutFrame>
    </SiteShell>
  );
}
