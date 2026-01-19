import { HouseIcon, InboxIcon, SettingsIcon } from "lucide-react";

import { Badge } from "@/registry/default/ui/badge";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/registry/default/ui/tabs";

export default function Particle() {
  return (
    <Tabs defaultValue="tab-1">
      <TabsList>
        <TabsTab value="tab-1">
          <HouseIcon aria-hidden="true" />
          <span className="sr-only">Overview</span>
        </TabsTab>
        <TabsTab value="tab-2">
          <InboxIcon aria-hidden="true" />
          <span className="sr-only">Inbox</span>
          <Badge className="ms-1" size="sm" variant="secondary">
            5
          </Badge>
        </TabsTab>
        <TabsTab value="tab-3">
          <SettingsIcon aria-hidden="true" />
          <span className="sr-only">Settings</span>
        </TabsTab>
      </TabsList>
      <TabsPanel value="tab-1">
        <p className="p-4 text-center text-muted-foreground text-xs">
          Overview content
        </p>
      </TabsPanel>
      <TabsPanel value="tab-2">
        <p className="p-4 text-center text-muted-foreground text-xs">
          Inbox content
        </p>
      </TabsPanel>
      <TabsPanel value="tab-3">
        <p className="p-4 text-center text-muted-foreground text-xs">
          Settings content
        </p>
      </TabsPanel>
    </Tabs>
  );
}
