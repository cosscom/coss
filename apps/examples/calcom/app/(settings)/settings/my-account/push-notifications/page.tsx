"use client";

import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { Field, FieldLabel } from "@coss/ui/components/field";
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
            <Field>
              <FieldLabel>
                <Switch />
                Allow browser notifications
              </FieldLabel>
            </Field>
          </CardPanel>
        </Card>
      </CardFrame>
    </div>
  );
}
