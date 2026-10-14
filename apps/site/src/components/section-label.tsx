"use client";
import { usePathname } from "next/navigation";

/** The sections named next to the wordmark (`coss.com docs`), like coss.com/ui's products. */
const SECTIONS = new Map([
  ["docs", "docs"],
  ["shipyard", "shipyard"],
  ["kloq", "kloq"],
]);

/** Next to the wordmark: the site section the page belongs to, for sections that are their own area. */
export function SectionLabel() {
  const pathname = usePathname();
  const section = pathname.split("/")[1];
  const label = section ? SECTIONS.get(section) : undefined;
  if (!label) return null;
  return <span className="text-muted-foreground/64">{label}</span>;
}
