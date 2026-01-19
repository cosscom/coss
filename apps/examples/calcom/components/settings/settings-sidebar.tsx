"use client";

import { cn } from "@coss/ui/lib/utils";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { settingsNavItems } from "@/lib/settings-navigation-data";

interface SettingsSidebarProps {
  className?: string;
}

export function SettingsSidebar({ className }: SettingsSidebarProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Settings navigation"
      className={cn(
        "fixed top-0 bottom-0 left-0 z-20 flex w-56 flex-col overflow-y-auto border-border border-r bg-sidebar px-3 py-4 max-lg:hidden",
        className,
      )}
    >
      <Link
        className="mb-6 flex items-center gap-2 rounded-md px-2 py-1.5 font-medium text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-foreground"
        href="/event-types"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back
      </Link>

      {settingsNavItems.map((section) => (
        <div className="mb-4" key={section.url}>
          <div className="flex items-center gap-2 px-2 py-1.5">
            {section.icon && (
              <section.icon className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-medium text-muted-foreground text-sm">
              {section.title}
            </span>
          </div>

          {section.children && (
            <div className="mt-1 flex flex-col gap-0.5">
              {section.children.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <Link
                    className={cn(
                      "rounded-md px-2 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-accent font-medium text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                    href={item.url}
                    key={item.url}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
