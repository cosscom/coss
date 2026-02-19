import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameAction,
  CardFrameDescription,
  CardFrameFooter,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { PlusIcon } from "lucide-react";

import { CalendarsDemoForm } from "./calendars-demo-form";

export default function CalendarsDemoPage() {
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

      <Card className="rounded-b-none!">
        <CardPanel>
          <CalendarsDemoForm />
        </CardPanel>
      </Card>

      <CardFrameFooter className="flex justify-end">
        <Button>Update</Button>
      </CardFrameFooter>
    </CardFrame>
  );
}
