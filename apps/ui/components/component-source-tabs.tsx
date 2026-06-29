"use client";

import { useState } from "react";
import { ScrollArea } from "@/registry/default/ui/scroll-area";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/registry/default/ui/tabs";
import { cn } from "@/lib/utils";

export type ComponentSourceTab = {
  panel: React.ReactNode;
  title: string;
  value: string;
};

export function ComponentSourceTabs({
  className,
  tabs,
}: {
  className?: string;
  tabs: ComponentSourceTab[];
}) {
  const [value, setValue] = useState(tabs[0]?.value ?? "");

  if (tabs.length === 0) {
    return null;
  }

  return (
    <Tabs
      className={cn("min-h-0 flex-1", className)}
      onValueChange={setValue}
      value={value}
    >
      <ScrollArea className="h-auto" scrollbarGutter scrollFade>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTab
              className="font-mono text-xs sm:text-xs"
              key={tab.value}
              value={tab.value}
            >
              {tab.title}
            </TabsTab>
          ))}
        </TabsList>
      </ScrollArea>
      <div className="flex min-h-0 flex-1 flex-col">
        {tabs.map((tab) => (
          <TabsPanel
            className="mt-0 flex min-h-0 flex-1 flex-col **:data-rehype-pretty-code-figure:mt-0 **:data-rehype-pretty-code-figure:flex **:data-rehype-pretty-code-figure:min-h-0 **:data-rehype-pretty-code-figure:flex-1 **:data-rehype-pretty-code-figure:flex-col [&_[data-rehype-pretty-code-figure]>div:first-of-type]:min-h-0 [&_[data-rehype-pretty-code-figure]>div:first-of-type]:flex-1"
            key={tab.value}
            value={tab.value}
          >
            {tab.panel}
          </TabsPanel>
        ))}
      </div>
    </Tabs>
  );
}
