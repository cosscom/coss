import { createFromSource } from "fumadocs-core/search/server";
import { calendarSource } from "@/lib/calendar-docs";

// kloq's docs have their own index (CALENDAR.searchApi, which their shell's command
// menu searches).
export const { GET } = createFromSource(calendarSource, { language: "english" });
