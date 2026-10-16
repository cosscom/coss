import type { MetadataRoute } from "next";
import { CALENDAR } from "@/lib/calendar";
import { COMPETITORS } from "@/lib/calendar/compare";
import { TOOLS } from "@/lib/calendar/tools";
import { calendarSource } from "@/lib/calendar-docs";
import { legalSource } from "@/lib/legal";
import { SHIPYARD } from "@/lib/shipyard";
import { shipyardSource } from "@/lib/shipyard-docs";
import { SITE_URL } from "@/lib/site";
import { source } from "@/lib/source";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL },
    { url: `${SITE_URL}/pricing` },
    { url: `${SITE_URL}/about` },
    { url: `${SITE_URL}${SHIPYARD.path}` },
    ...shipyardSource.getPages().map((page) => ({ url: `${SITE_URL}${page.url}` })),
    { url: `${SITE_URL}${CALENDAR.path}` },
    { url: `${SITE_URL}${CALENDAR.demo}` },
    { url: `${SITE_URL}${CALENDAR.tools}` },
    ...TOOLS.map((tool) => ({ url: `${SITE_URL}${CALENDAR.tools}/${tool.slug}` })),
    { url: `${SITE_URL}${CALENDAR.compare}` },
    ...COMPETITORS.map((c) => ({ url: `${SITE_URL}${CALENDAR.compare}/${c.slug}` })),
    ...calendarSource.getPages().map((page) => ({ url: `${SITE_URL}${page.url}` })),
    ...source.getPages().map((page) => ({ url: `${SITE_URL}${page.url}` })),
    { url: `${SITE_URL}/legal` },
    ...legalSource.getPages().map((page) => ({ url: `${SITE_URL}${page.url}` })),
  ];
}
