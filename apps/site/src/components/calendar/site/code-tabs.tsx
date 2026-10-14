"use client";

import { cn } from "@coss/ui/lib/utils";
import type { ReactNode } from "react";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/calendar/ui/tabs";
import { type CodePane, CodePanes } from "./code-panes";

export type CodeTab = {
  id: string;
  label: ReactNode;
  panes: CodePane[];
  /** mono caption under the panes */
  note?: ReactNode;
};

export function CodeTabs({
  tabs,
  label,
  defaultValue,
  className,
}: {
  tabs: CodeTab[];
  /** accessible name for the tablist */
  label: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <Tabs defaultValue={defaultValue ?? tabs[0]?.id} className={cn("min-w-0 gap-4", className)}>
      <TabsList aria-label={label}>
        {tabs.map((tab) => (
          <TabsTab key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTab>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsPanel key={tab.id} value={tab.id}>
          <CodePanes panes={tab.panes} />
          {tab.note && (
            <p className="mt-3 font-mono text-xs leading-5 text-muted-foreground">{tab.note}</p>
          )}
        </TabsPanel>
      ))}
    </Tabs>
  );
}
