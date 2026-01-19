"use client";

import { HouseIcon, PanelsTopLeftIcon, SettingsIcon } from "lucide-react";
import type { ComponentType } from "react";

import { Tabs, TabsList, TabsPanel, TabsTab } from "@/registry/default/ui/tabs";
import {
  Tooltip,
  TooltipCreateHandle,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/default/ui/tooltip";

const tooltipHandle = TooltipCreateHandle<ComponentType>();

const OverviewContent = () => {
  return <span>Overview</span>;
};

const ProjectsContent = () => {
  return <span>Projects</span>;
};

const SettingsContent = () => {
  return <span>Settings</span>;
};

export default function Particle() {
  return (
    <TooltipProvider>
      <Tabs defaultValue="tab-1">
        <TabsList>
          <TooltipTrigger
            handle={tooltipHandle}
            payload={OverviewContent}
            render={<TabsTab value="tab-1" />}
          >
            <HouseIcon aria-hidden="true" />
            <span className="sr-only">Overview</span>
          </TooltipTrigger>
          <TooltipTrigger
            handle={tooltipHandle}
            payload={ProjectsContent}
            render={<TabsTab value="tab-2" />}
          >
            <PanelsTopLeftIcon aria-hidden="true" />
            <span className="sr-only">Projects</span>
          </TooltipTrigger>
          <TooltipTrigger
            handle={tooltipHandle}
            payload={SettingsContent}
            render={<TabsTab value="tab-3" />}
          >
            <SettingsIcon aria-hidden="true" />
            <span className="sr-only">Settings</span>
          </TooltipTrigger>
        </TabsList>
        <TabsPanel value="tab-1">
          <p className="p-4 text-center text-muted-foreground text-xs">
            Overview content
          </p>
        </TabsPanel>
        <TabsPanel value="tab-2">
          <p className="p-4 text-center text-muted-foreground text-xs">
            Projects content
          </p>
        </TabsPanel>
        <TabsPanel value="tab-3">
          <p className="p-4 text-center text-muted-foreground text-xs">
            Settings content
          </p>
        </TabsPanel>
      </Tabs>

      <Tooltip handle={tooltipHandle}>
        {({ payload: Payload }) => (
          <TooltipPopup>{Payload !== undefined && <Payload />}</TooltipPopup>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
