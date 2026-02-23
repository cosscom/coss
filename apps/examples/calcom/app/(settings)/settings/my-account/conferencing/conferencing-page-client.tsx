"use client";

import { Button } from "@coss/ui/components/button";
import { Card, CardPanel } from "@coss/ui/components/card";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import {
  AppHeader,
  AppHeaderActions,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";
import {
  type ConferencingApp,
  ConferencingEmpty,
  initialConferencingApps,
} from "./conferencing-empty";

export function ConferencingPageClient() {
  const [apps, setApps] = useState<ConferencingApp[]>(initialConferencingApps);

  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Conferencing">
          <AppHeaderDescription>
            Add your favourite video conferencing apps for your meetings
          </AppHeaderDescription>
        </AppHeaderContent>
        <AppHeaderActions>
          <Button variant="outline">
            <PlusIcon />
            Add
          </Button>
        </AppHeaderActions>
      </AppHeader>

      {apps.length > 0 ? (
        <Card>
          <CardPanel className="p-0">
            <ConferencingEmpty apps={apps} onAppsChange={setApps} />
          </CardPanel>
        </Card>
      ) : (
        <ConferencingEmpty apps={apps} onAppsChange={setApps} />
      )}
    </>
  );
}
