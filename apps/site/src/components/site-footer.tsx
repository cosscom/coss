import { cn } from "@coss/ui/lib/utils";
import Link from "next/link";

export const LEGAL_LINKS = [
  { text: "Terms", url: "/legal/terms" },
  { text: "Privacy", url: "/legal/privacy" },
  { text: "Acceptable Use", url: "/legal/acceptable-use" },
  { text: "DPA", url: "/legal/dpa" },
] as const;

/** Legal links, linked from every page of the site. */
export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Legal" className={className}>
      {LEGAL_LINKS.map((link) => (
        <Link className="hover:text-foreground" href={link.url} key={link.url}>
          {link.text}
        </Link>
      ))}
    </nav>
  );
}

/** The wordmark and company line of coss.com/ui's docs footer. */
function Colophon({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <p>
        <Link
          className="font-bold font-heading text-foreground text-lg [font-variation-settings:'GEOM'_50,'opsz'_32]"
          href="/"
        >
          coss.com
        </Link>
      </p>
      <p className="text-muted-foreground text-sm">© {new Date().getFullYear()} Cal.com, Inc.</p>
    </div>
  );
}

/** Footer of the landing page, the pricing page and the legal pages (full width, below the rails). */
export function SiteFooter() {
  return (
    <footer className="relative mt-8 py-8 text-muted-foreground before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-border/64">
      <div className="container flex w-full flex-col gap-4 px-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <Colophon />
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link className="hover:text-foreground" href="/about">
            About
          </Link>
          <LegalLinks className="contents" />
        </div>
      </div>
    </footer>
  );
}

/** Footer of a docs page: inside its card, like coss.com/ui. */
export function DocsFooter() {
  return (
    <footer className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <Colophon />
      <LegalLinks className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-sm" />
    </footer>
  );
}
