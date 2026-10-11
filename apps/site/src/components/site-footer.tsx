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

/** Footer of the landing page and the legal pages (the docs show `LegalLinks` in their sidebar). */
export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-8 text-muted-foreground text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Cal.com, Inc.</p>
        <LegalLinks className="flex flex-wrap gap-x-6 gap-y-2" />
      </div>
    </footer>
  );
}
