"use client";

import { cn } from "@coss/ui/lib/utils";
import { Button } from "@coss/ui/ui/button";
import { Sheet, SheetPopup, SheetTrigger } from "@coss/ui/ui/sheet";
import { Menu09Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link, { type LinkProps } from "next/link";
import * as React from "react";

export type PageNode = {
  type: "page";
  name: string;
  url: string;
};

export type FolderNode = {
  type: "folder";
  name: string;
  children: (PageNode | FolderNode)[];
};

export type NavTree = {
  children: FolderNode[];
};

export function MobileNav({
  tree,
  items,
  className,
}: {
  tree?: NavTree;
  items: { href: string; label: string }[];
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn("-ms-1.5 relative size-8", className)}
          >
            <HugeiconsIcon
              icon={Menu09Icon}
              strokeWidth={2}
              className="size-5"
            />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        }
      />
      <SheetPopup side="left">
        <div className="flex flex-col gap-12 overflow-auto p-6 pt-8">
          <div className="flex flex-col gap-3">
            <div className="font-medium text-sm">Menu</div>
            <div className="flex flex-col gap-2">
              <MobileLink href="/" onOpenChange={setOpen}>
                Home
              </MobileLink>
              {items.map((item) => (
                <MobileLink
                  key={item.label}
                  href={item.href}
                  onOpenChange={setOpen}
                >
                  {item.label}
                </MobileLink>
              ))}
            </div>
          </div>
          {tree ? (
            <div className="flex flex-col gap-8">
              {tree?.children?.map((group: FolderNode, index: number) => {
                if (group.type === "folder") {
                  return (
                    <div key={group.name} className="flex flex-col gap-3">
                      <div className="font-medium text-sm">{group.name}</div>
                      <div className="flex flex-col gap-2">
                        {group.children.map((item) => {
                          if (item.type === "page") {
                            return (
                              <MobileLink
                                key={`${item.url}-${index}`}
                                href={item.url}
                                onOpenChange={setOpen}
                              >
                                {item.name}
                              </MobileLink>
                            );
                          }
                        })}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          ) : null}
        </div>
      </SheetPopup>
    </Sheet>
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
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={() => {
        onOpenChange?.(false);
      }}
      className={cn("text-muted-foreground", className)}
      {...props}
    >
      {children}
    </Link>
  );
}
