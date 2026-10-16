"use client";

import { Badge } from "@coss/ui/components/badge";
import { cn } from "@coss/ui/lib/utils";
import { BarChart3Icon, BookOpenIcon, FactoryIcon, MessageSquareTextIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

type Tab = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  count?: number;
  exact?: boolean;
};

/** GitHub's repository tabs: Code, Issues and the rest are gone; what's left is about prompts. */
export function ProjectTabs({
  base,
  open,
  building,
}: {
  base: string;
  open: number;
  building: number;
}) {
  const pathname = usePathname();
  const tabs: Tab[] = [
    { href: base, label: "Overview", icon: BookOpenIcon, exact: true },
    { href: `${base}/prompts`, label: "Prompt requests", icon: MessageSquareTextIcon, count: open },
    { href: `${base}/factory`, label: "Factory", icon: FactoryIcon, count: building },
    { href: `${base}/insights`, label: "Insights", icon: BarChart3Icon },
  ];
  return (
    <nav aria-label="Project" className="-mb-px flex gap-1 overflow-x-auto">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors hover:text-foreground",
              active
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground",
            )}
            href={tab.href}
            key={tab.href}
          >
            <tab.icon aria-hidden className="size-4" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <Badge className="px-1.5" variant="secondary">
                {tab.count}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
