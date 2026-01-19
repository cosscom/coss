import { HouseIcon, PanelsTopLeftIcon, SettingsIcon } from "lucide-react";

import { Tabs, TabsList, TabsPanel, TabsTab } from "@/registry/default/ui/tabs";
import {
  Tooltip,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/default/ui/tooltip";

export default function Particle() {
  return (
    <TooltipProvider>
      <Tabs defaultValue="tab-1">
        <TabsList>
          <Tooltip>
            <TooltipTrigger render={<TabsTab value="tab-1" />}>
              <HouseIcon aria-hidden="true" />
              <span className="sr-only">Overview</span>
            </TooltipTrigger>
            <TooltipPopup>Overview</TooltipPopup>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<TabsTab value="tab-2" />}>
              <PanelsTopLeftIcon aria-hidden="true" />
              <span className="sr-only">Projects</span>
            </TooltipTrigger>
            <TooltipPopup>Projects</TooltipPopup>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<TabsTab value="tab-3" />}>
              <SettingsIcon aria-hidden="true" />
              <span className="sr-only">Settings</span>
            </TooltipTrigger>
            <TooltipPopup>Settings</TooltipPopup>
          </Tooltip>
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
    </TooltipProvider>
  );
}
