import { Tabs, TabsList, TabsPanel, TabsTab } from "@/registry/default/ui/tabs";

const tabs = [
  { label: "Overview", value: "tab-1" },
  { label: "Insights", value: "tab-2" },
  { label: "Performance", value: "tab-3" },
  { label: "Members", value: "tab-4" },
  { label: "Integrations", value: "tab-5" },
  { label: "Billing", value: "tab-6" },
  { label: "Notifications", value: "tab-7" },
  { label: "Audit log", value: "tab-8" },
];

export default function Particle() {
  return (
    <Tabs defaultValue="tab-1">
      <TabsList scrollFade>
        {tabs.map((tab) => (
          <TabsTab key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTab>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsPanel key={tab.value} value={tab.value}>
          <p className="p-4 text-center text-muted-foreground text-xs">
            {tab.label} content
          </p>
        </TabsPanel>
      ))}
    </Tabs>
  );
}
