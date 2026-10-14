import { CALENDAR } from "@/lib/calendar";
import { docsSections } from "@/lib/calendar/llms";
import { abs } from "@/lib/calendar/site";

export const revalidate = false;

/** kloq's llms.txt: the map of its docs (coss.com/kloq's, under /kloq). */
export function GET() {
  const lines = [
    `# ${CALENDAR.name} (kloq)`,
    "",
    "> A React calendar component obsessed with micro-perfection: hand-tuned drag",
    "> physics, a design mode that annotates its own craft, a ⌘K command palette,",
    "> RRULE recurrence and ICS in both directions. Ships two ways — `npm install",
    "> kloq` for the compiled build, or the shadcn registry (`npx shadcn add",
    "> @kloq/kloq`) which lands the whole library in your repo as source you can edit.",
    "",
    `The whole manual as one file: ${abs("/kloq/llms-full.txt")}`,
    "",
    "## Site",
    "",
    `- [Home](${abs(CALENDAR.path)}): what the calendar is, the interactions, and the two ways to install it.`,
    `- [Live demo](${abs(CALENDAR.demo)}): the full calendar backed by localStorage — drag things around.`,
    `- [Installation](${abs(`${CALENDAR.docs}/installation`)}): install from npm or add the source through the registry.`,
  ];

  for (const section of docsSections()) {
    lines.push("", `## ${section.label}`, "");
    for (const page of section.pages) {
      const link = `[${page.data.title}](${abs(page.url)})`;
      lines.push(page.data.description ? `- ${link}: ${page.data.description}` : `- ${link}`);
    }
  }

  return new Response(`${lines.join("\n")}\n`, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
