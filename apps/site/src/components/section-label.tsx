"use client";
import { usePathname } from "next/navigation";

/** The sections named next to the wordmark (`coss.com docs`), like coss.com/ui's products. */
const SECTIONS = new Set(["docs", "shipyard", "calendar"]);

/** Next to the wordmark: the site section the page belongs to, for sections that are their own area. */
export function SectionLabel() {
  const pathname = usePathname();
  const section = pathname.split("/")[1];
  if (!section || !SECTIONS.has(section)) return null;
  return <span className="text-muted-foreground/64">{section}</span>;
}
