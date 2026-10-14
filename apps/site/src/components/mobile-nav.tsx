"use client";
import { Button } from "@coss/ui/components/button";
import { Drawer, DrawerPanel, DrawerPopup, DrawerTrigger } from "@coss/ui/components/drawer";
import { cn } from "@coss/ui/lib/utils";
import { Menu09Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type * as PageTree from "fumadocs-core/page-tree";
import Link, { type LinkProps } from "next/link";
import { type ReactNode, useState } from "react";
import { allGroups } from "@/lib/docs-tree";
import { PRODUCT_COLUMNS } from "@/lib/nav";
import type { NavItem } from "@/lib/site";

/** The site's sections, every product and every docs page, in a drawer (below `lg`, where the header's menus are hidden). */
export function MobileNav({
  tree,
  items,
  className,
}: {
  tree: PageTree.Root;
  items: readonly NavItem[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer onOpenChange={setOpen} open={open} position="left">
      <DrawerTrigger
        render={
          <Button className={cn("relative -ms-1.5 size-8", className)} size="icon" variant="ghost">
            <HugeiconsIcon className="size-5" icon={Menu09Icon} strokeWidth={2} />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        }
      />
      <DrawerPopup showCloseButton variant="straight">
        <DrawerPanel className="flex flex-col gap-12 p-6 pt-8" scrollFade={false}>
          <div className="flex flex-col gap-3">
            <div className="font-medium text-sm">Menu</div>
            <div className="flex flex-col gap-1">
              <MobileLink href="/" onOpenChange={setOpen}>
                Home
              </MobileLink>
              {items.map((item) =>
                item.external ? (
                  <a
                    className="flex items-center gap-2 py-1.5 text-muted-foreground"
                    href={item.href}
                    key={item.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {item.label}
                  </a>
                ) : (
                  <MobileLink href={item.href} key={item.href} onOpenChange={setOpen}>
                    {item.label}
                  </MobileLink>
                ),
              )}
            </div>
          </div>
          <div className="flex flex-col gap-8">
            {PRODUCT_COLUMNS.map((column) => (
              <div className="flex flex-col gap-3" key={column.title}>
                <div className="font-medium text-sm">{column.title}</div>
                <div className="flex flex-col gap-0.5">
                  {column.links.map((link) =>
                    link.zone ? (
                      <a
                        className="flex items-center gap-2 py-1.5 text-muted-foreground"
                        href={link.href}
                        key={link.label}
                      >
                        {link.label}
                      </a>
                    ) : (
                      <MobileLink href={link.href} key={link.label} onOpenChange={setOpen}>
                        {link.label}
                      </MobileLink>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-8">
            {allGroups(tree).map((group) => (
              <div className="flex flex-col gap-3" key={group.key}>
                <div className="font-medium text-sm">{group.label}</div>
                <div className="flex flex-col gap-0.5">
                  {group.pages.map((page) => (
                    <MobileLink href={page.url} key={page.url} onOpenChange={setOpen}>
                      {page.name}
                    </MobileLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DrawerPanel>
      </DrawerPopup>
    </Drawer>
  );
}

function MobileLink({
  href,
  onOpenChange,
  className,
  children,
  ...props
}: LinkProps & {
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      className={cn("flex items-center gap-2 py-1.5 text-muted-foreground", className)}
      href={href}
      onClick={() => onOpenChange?.(false)}
      {...props}
    >
      {children}
    </Link>
  );
}
