"use client";

import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { Label } from "@coss/ui/components/label";
import { Switch } from "@coss/ui/components/switch";

export default function PushNotificationsPage() {
  return (
    <div className="space-y-4">
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Push notifications</CardFrameTitle>
          <CardFrameDescription>
            Receive push notifications when booker submits instant meeting
            booking.
          </CardFrameDescription>
        </CardFrameHeader>

        <Card className="rounded-t-none!">
          <CardPanel>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="browser-notifications">
                Allow browser notifications
              </Label>
              <Switch id="browser-notifications" />
            </div>
          </CardPanel>
        </Card>
      </CardFrame>
    </div>
  );
}
