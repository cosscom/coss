import { Separator } from "@coss/ui/components/separator";
import Link from "next/link";
import { NAV_ITEMS, type NavItem } from "@/lib/site";
import { source } from "@/lib/source";
import { AccountLinks } from "./account-links";
import { CommandMenu } from "./command-menu";
import { GitHubLink } from "./github-link";
import { MainNav } from "./main-nav";
import { MobileNav } from "./mobile-nav";
import { ModeSwitcher } from "./mode-switcher";
import { SectionLabel } from "./section-label";

/**
 * The header of coss.com/ui (the coss ui docs), adapted: the wordmark names the section instead
 * of a product, the nav links the site's sections (or a landing page's own), and the account links
 * replace the product menu.
 */
export function SiteHeader({ items = NAV_ITEMS }: { items?: readonly NavItem[] }) {
  const tree = source.getPageTree();

  return (
    <header className="sticky top-0 z-40 w-full bg-sidebar/80 backdrop-blur-sm before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-border/64">
      <div className="container relative flex h-(--header-height) w-full items-center justify-between gap-2 px-4 sm:px-6">
        <MobileNav className="flex lg:hidden" items={items} tree={tree} />
        <div className="flex shrink-0 items-center gap-1.5 font-bold font-heading text-[1.375em] [font-variation-settings:'GEOM'_50,'opsz'_32] sm:text-2xl">
          <Link aria-label="Home" href="/">
            coss.com
          </Link>
          <SectionLabel />
        </div>
        <div className="ms-auto flex items-center gap-2 md:flex-1 md:justify-end">
          <MainNav className="hidden lg:flex" items={items} />
          <div className="mx-2 hidden w-full flex-1 md:flex md:w-auto md:flex-none">
            <CommandMenu navItems={NAV_ITEMS} tree={tree} />
          </div>
          <Separator className="h-5 max-md:hidden" orientation="vertical" />
          <AccountLinks />
          <GitHubLink />
          <ModeSwitcher />
        </div>
      </div>
    </header>
  );
}
