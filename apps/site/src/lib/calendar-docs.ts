import "server-only";
import { loader } from "fumadocs-core/source";
import { CALENDAR } from "./calendar";
import { calendar } from "./collections";

/**
 * The Calendar UI's docs (content/calendar) at /calendar/docs. Their own source, so they stay
 * out of coss's docs sidebar, search (/calendar/docs/search.json is theirs) and /llms.txt.
 */
export const calendarSource = loader({
  source: calendar.toFumadocsSource(),
  baseUrl: CALENDAR.docs,
});

export type CalendarPage = NonNullable<ReturnType<typeof calendarSource.getPage>>;

/** A page as Markdown: "Copy Markdown", /calendar/llms.txt and /calendar/llms-full.txt. */
export async function calendarPageMarkdown(page: CalendarPage): Promise<string> {
  return `# ${page.data.title} (${page.url})\n\n${await page.data.getText("processed")}`;
}
