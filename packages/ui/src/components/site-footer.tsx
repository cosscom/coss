// @ts-ignore - Next types are supplied by consuming app via peerDependencies
import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="py-8 text-muted-foreground">
      <div className="container flex w-full items-center justify-center gap-2 px-4 sm:px-6">
        <p>© 2025 <Link href="/" className="font-heading text-lg text-foreground">coss.com</Link> – open source, open heart, open mind.</p>
      </div>
    </footer>
  )
}
