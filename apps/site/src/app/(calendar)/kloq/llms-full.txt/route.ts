import { CALENDAR } from "@/lib/calendar";
import { docsSections } from "@/lib/calendar/llms";
import { calendarPageMarkdown } from "@/lib/calendar-docs";

export const revalidate = false;

/** kloq's llms-full.txt: the whole manual inlined. */
export async function GET() {
  const parts = [`# ${CALENDAR.name} (kloq) — the complete documentation`, ""];
  for (const section of docsSections()) {
    parts.push("---", "", `## ${section.label}`, "");
    for (const page of section.pages) parts.push(await calendarPageMarkdown(page), "");
  }
  return new Response(parts.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
