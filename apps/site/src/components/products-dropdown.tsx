"use client";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@coss/ui/components/menu";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { PRODUCT_MENU } from "@/lib/site";

/** The "Products" menu of coss.com/ui's header: coss.com's products, each on its own path. */
export function ProductsDropdown() {
  return (
    <Menu>
      <MenuTrigger render={<Button variant="ghost" />}>
        Products
        <ChevronDown />
      </MenuTrigger>
      <MenuPopup align="center" sideOffset={4}>
        {PRODUCT_MENU.map((item) => (
          <MenuItem
            className="group justify-between"
            key={item.href}
            // biome-ignore lint/a11y/useAnchorContent: the item's label renders inside
            render={item.zone ? <a href={item.href} /> : <Link href={item.href} />}
          >
            <span className="font-bold font-heading in-data-highlighted:text-foreground text-muted-foreground">
              {item.label}
            </span>
            {item.badge && (
              <Badge className="-me-0.5 font-medium" size="sm" variant="info">
                {item.badge}
              </Badge>
            )}
          </MenuItem>
        ))}
      </MenuPopup>
    </Menu>
  );
}
