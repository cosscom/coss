import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="flex flex-col gap-0.5">
      <p>
        <Link href="/" className="font-heading text-lg">
          coss.com <span className="text-muted-foreground/64">ui</span>
        </Link>
      </p>
      <p className="text-muted-foreground text-sm">
        Built by and for the team of{" "}
        <a
          className="font-medium underline-offset-4 hover:underline"
          href="https://cal.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Cal.com
        </a>
        , Inc. — the leading commercial open source company
        (&ldquo;coss&rdquo;).
      </p>
    </footer>
  );
}
