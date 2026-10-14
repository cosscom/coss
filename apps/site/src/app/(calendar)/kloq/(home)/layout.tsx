import { SiteFooter } from "@/components/site-footer";
import { SiteShell } from "@/components/site-shell";
import { CALENDAR, CALENDAR_LINKS } from "@/lib/calendar";
import { calendarSource } from "@/lib/calendar-docs";

// The landing page, the demo, the tools and the comparisons in the site's shell, with the
// kloq's header links; the ⌘K menu searches its docs.
export default function Layout({ children }: LayoutProps<"/kloq">) {
  return (
    <SiteShell
      github={{ repo: CALENDAR.githubRepo, href: CALENDAR.github }}
      items={CALENDAR_LINKS}
      searchApi={CALENDAR.searchApi}
      tree={calendarSource.getPageTree()}
    >
      {children}
      <SiteFooter />
    </SiteShell>
  );
}
