"use client";

import { Button } from "@coss/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetPanel,
  SheetTitle,
  SheetTrigger,
} from "@coss/ui/components/sheet";
import { ArrowRightIcon, MenuIcon } from "lucide-react";
import Link from "next/link";
import type { ReactElement } from "react";

const navItems = [
  { href: "#product", label: "Product" },
  { href: "#solutions", label: "Solutions" },
  { href: "#enterprise", label: "Enterprise" },
  { href: "#pricing", label: "Pricing" },
  { href: "#docs", label: "Docs" },
];

function BrandLockup(): ReactElement {
  return (
    <div className="-mt-0.5 flex shrink-0 items-center gap-1.5 font-bold font-heading text-2xl tracking-tighter sm:text-[1.625em]">
      <Link aria-label="Home" href="/">
        Cal.com
      </Link>
    </div>
  );
}

function MobileNavigation(): ReactElement {
  return (
    <Sheet>
      <SheetTrigger
        render={<Button className="md:hidden" size="icon" variant="outline" />}
      >
        <MenuIcon className="opacity-80" />
      </SheetTrigger>
      <SheetContent className="md:hidden" side="right">
        <SheetHeader>
          <SheetTitle>cal.com</SheetTitle>
          <SheetDescription>
            A sharper marketing shell inspired by the COSS visual language.
          </SheetDescription>
        </SheetHeader>
        <SheetPanel className="space-y-2">
          {navItems.map((item) => (
            <Button
              className="w-full justify-start"
              key={item.label}
              render={<Link href={item.href} />}
              size="lg"
              variant="ghost"
            >
              {item.label}
            </Button>
          ))}
          <div className="space-y-3 pt-4">
            <Button
              className="w-full"
              render={<Link href="#signin" />}
              size="lg"
              variant="outline"
            >
              Sign in
            </Button>
            <Button className="w-full" render={<Link href="#cta" />} size="lg">
              Get started
              <ArrowRightIcon className="opacity-80" />
            </Button>
          </div>
        </SheetPanel>
      </SheetContent>
    </Sheet>
  );
}

export function MarketingHeader(): ReactElement {
  return (
    <header>
      <div className="relative mx-auto flex h-(--header-height) w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <BrandLockup />

        <nav className="ml-8 hidden flex-1 items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              className="rounded-full px-4 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-accent/60 hover:text-foreground"
              href={item.href}
              key={item.label}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <Button render={<Link href="#signin" />} variant="ghost">
            Sign in
          </Button>
          <Button render={<Link href="#cta" />}>
            Start for free
            <ArrowRightIcon className="opacity-80" />
          </Button>
        </div>

        <div className="ml-auto md:hidden">
          <MobileNavigation />
        </div>
      </div>
    </header>
  );
}
