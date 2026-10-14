"use client";

import { cn } from "@coss/ui/lib/utils";
import type { ComponentProps } from "react";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/calendar/ui/tabs";

/** The docs tab strip: the tabs primitive's underline variant with mono labels. */
export function UnderlineTabs({ className, ...props }: ComponentProps<typeof Tabs>) {
  return <Tabs className={cn("gap-0", className)} {...props} />;
}

export function UnderlineTabList(props: Omit<ComponentProps<typeof TabsList>, "variant">) {
  return <TabsList size="sm" {...props} variant="underline" />;
}

export function UnderlineTab({ className, ...props }: ComponentProps<typeof TabsTab>) {
  return <TabsTab className={cn("font-mono", className)} {...props} />;
}

export const UnderlinePanel = TabsPanel;
