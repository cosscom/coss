// @ts-ignore - Next types are supplied by consuming app via peerDependencies
import Link from "next/link"

import { siteConfig } from "@workspace/ui/lib/config"
import { GitHubLink } from "@workspace/ui/components/github-link"
import { ModeSwitcher } from "@workspace/ui/components/mode-switcher"
import { ProductLabel } from "@workspace/ui/components/product-label"
import { ProductsDropdown } from "@workspace/ui/components/products-dropdown"
import { Separator } from "@workspace/ui/ui/separator"

export function SiteHeader({ mobileNav, children }: { mobileNav?: React.ReactNode; children?: React.ReactNode }) {
  const gatewayOrigin = process.env.NEXT_PUBLIC_COSS_URL || ""
  const gatewayHome = gatewayOrigin ? `${gatewayOrigin}/` : "/"
  const isExternal = !!gatewayOrigin

  return (
    <header className="sticky top-0 z-50 w-full bg-sidebar/80 backdrop-blur-sm">
      <div className="container flex h-(--header-height) w-full items-center justify-between gap-2 px-4 sm:px-6">
        {mobileNav}
        <div className="-mt-0.5 font-heading text-2xl sm:text-[1.625em] flex shrink-0 gap-1.5 items-center">
          {isExternal ? (
            <a href={gatewayHome} aria-label="Home">
              coss.com
            </a>
          ) : (
            <Link href={gatewayHome} aria-label="Home">
              coss.com
            </Link>
          )}
          <ProductLabel items={siteConfig.products} />
        </div>
        <div className="ms-auto flex items-center gap-2 md:flex-1 md:justify-end">
          {children}
          <ProductsDropdown items={siteConfig.products} />
          <Separator orientation="vertical" className="h-5 max-md:hidden" />
          <GitHubLink />
          <Separator orientation="vertical" className="h-5 max-md:hidden" />
          <ModeSwitcher />
        </div>
      </div>
    </header>
  )
}
