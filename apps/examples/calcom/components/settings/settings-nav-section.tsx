"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import type {
  SettingsNavChild,
  SettingsNavItem,
} from "@/lib/settings-navigation-data";

interface SettingsNavSectionProps {
  section: SettingsNavItem;
  pathname: string;
  variant: "sidebar" | "sheet";
  onItemClick?: () => void;
}

export function SettingsNavSection({
  section,
  pathname,
  variant,
  onItemClick,
}: SettingsNavSectionProps) {
  if (variant === "sheet") {
    return (
      <div className="flex flex-col gap-2">
        <SettingsNavSectionHeader section={section} variant="sheet" />
        {section.children && (
          <div className="flex flex-col gap-0.5 ps-6">
            {section.children.map((item) => (
              <SettingsNavSheetItem
                isActive={pathname === item.url}
                item={item}
                key={item.url}
                onClick={onItemClick}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Sidebar variant - uses sidebar-specific components
  return null; // Sidebar uses its own components, this is handled in settings-sidebar.tsx
}

function SettingsNavSectionHeader({
  section,
  variant,
}: {
  section: SettingsNavItem;
  variant: "sidebar" | "sheet";
}) {
  const baseClassName =
    variant === "sheet"
      ? "flex items-center gap-2 font-medium text-sidebar-accent-foreground text-sm"
      : "flex items-center gap-2 font-medium text-sidebar-accent-foreground text-sm";

  return (
    <div className={baseClassName}>
      {section.avatar && (
        <Avatar className="size-4">
          <AvatarImage alt={section.title} src={section.avatar.src} />
          <AvatarFallback className="text-[.625rem]">
            {section.avatar.fallback}
          </AvatarFallback>
        </Avatar>
      )}
      {section.icon && <section.icon className="size-4 opacity-80" />}
      <span>{section.title}</span>
    </div>
  );
}

function SettingsNavSheetItem({
  item,
  isActive,
  onClick,
}: {
  item: SettingsNavChild;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-muted-foreground text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
      data-active={isActive}
      href={item.url}
      onClick={onClick}
    >
      {item.title}
      {item.external && <ExternalLinkIcon className="size-3 opacity-80" />}
    </Link>
  );
}

export { SettingsNavSectionHeader, SettingsNavSheetItem };
