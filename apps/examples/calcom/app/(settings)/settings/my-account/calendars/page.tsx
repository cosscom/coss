import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameAction,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { PlusIcon } from "lucide-react";

import { CalendarsEmpty } from "./calendars-empty";

export default function CalendarsSettingsPage() {
  return (
    <CardFrame>
      <CardFrameHeader>
        <CardFrameTitle>Calendars</CardFrameTitle>
        <CardFrameDescription>
          Configure how your event types interact with your calendars
        </CardFrameDescription>
        <CardFrameAction>
          <Button variant="outline">
            <PlusIcon />
            Add calendar
          </Button>
        </CardFrameAction>
      </CardFrameHeader>

      <Card>
        <CardPanel className="p-0">
          <CalendarsEmpty />
        </CardPanel>
      </Card>
    </CardFrame>
  );
}
