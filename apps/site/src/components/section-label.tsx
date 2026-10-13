"use client";
import { usePathname } from "next/navigation";

/** Next to the wordmark: the site section the page belongs to (`coss.com docs`), like coss.com/ui. */
export function SectionLabel() {
  const pathname = usePathname();
  const section = pathname.split("/")[1];
  if (!section) return null;
  return <span className="text-muted-foreground/64">{section}</span>;
}
