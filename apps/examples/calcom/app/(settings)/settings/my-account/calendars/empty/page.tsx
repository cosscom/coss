import { Button } from "@coss/ui/components/button";
import { Card, CardFrame, CardPanel } from "@coss/ui/components/card";
import { PlusIcon } from "lucide-react";
import {
  AppHeader,
  AppHeaderActions,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";

import { CalendarsEmpty } from "../calendars-empty";

export default function CalendarsEmptyPage() {
  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Calendars">
          <AppHeaderDescription>
            Configure how your event types interact with your calendars
          </AppHeaderDescription>
        </AppHeaderContent>
        <AppHeaderActions>
          <Button variant="outline">
            <PlusIcon />
            Add calendar
          </Button>
        </AppHeaderActions>
      </AppHeader>
      <CardFrame>
        <Card>
          <CardPanel className="p-0">
            <CalendarsEmpty />
          </CardPanel>
        </Card>
      </CardFrame>
    </>
  );
}
