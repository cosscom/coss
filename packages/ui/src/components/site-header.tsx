import Link from "next/link"

import { GitHubLink } from "@coss/ui/components/github-link"
import { ModeSwitcher } from "@coss/ui/components/mode-switcher"
import { ProductLabel } from "@coss/ui/components/product-label"
import { ProductsDropdown } from "@coss/ui/components/products-dropdown"
import { siteConfig } from "@coss/ui/lib/config"

export function SiteHeader({
  mobileNav,
  children,
  currentProduct,
}: {
  mobileNav?: React.ReactNode
  children?: React.ReactNode
  currentProduct?: string
}) {
  const gatewayOrigin = process.env.NEXT_PUBLIC_COSS_URL || ""
  const gatewayHome = gatewayOrigin ? `${gatewayOrigin}/` : "/"
  const isExternal = !!gatewayOrigin

  return (
    <header className="sticky top-0 z-40 w-full bg-sidebar/80 backdrop-blur-sm before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-border/50">
      <div className="relative container flex h-(--header-height) w-full items-center justify-between gap-2 px-4 sm:px-6">
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
          <ProductLabel
            items={siteConfig.products}
            currentProduct={currentProduct}
          />
        </div>
        <div className="ms-auto flex items-center gap-2 md:flex-1 md:justify-end">
          {children}
          <ProductsDropdown items={siteConfig.products} />
          <GitHubLink />
          <ModeSwitcher />
        </div>
      </div>
    </header>
  )
}
