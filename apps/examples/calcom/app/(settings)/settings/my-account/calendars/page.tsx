import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { PlusIcon } from "lucide-react";
import {
  AppHeader,
  AppHeaderActions,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";

import { CalendarsDemoForm } from "./calendars-demo-form";
import { CheckForConflictsCard } from "./check-for-conflicts-card";

export default function CalendarsSettingsPage() {
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

      <div className="flex flex-col gap-4">
        <CardFrame>
          <CardFrameHeader>
            <CardFrameTitle>Add to calendar</CardFrameTitle>
            <CardFrameDescription>
              Select where to add events when you&apos;re booked.
            </CardFrameDescription>
          </CardFrameHeader>

          <Card className="rounded-b-none!">
            <CardPanel>
              <CalendarsDemoForm />
            </CardPanel>
          </Card>
        </CardFrame>

        <CheckForConflictsCard />
      </div>
    </>
  );
}
