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
import { toastManager } from "@coss/ui/components/toast";
import { useState } from "react";

export default function PushNotificationsPage() {
  const [enabled, setEnabled] = useState(false);

  function handleToggle(checked: boolean) {
    setEnabled(checked);
    toastManager.add({
      title: checked
        ? "Notifications enabled successfully"
        : "Notifications disabled successfully",
      type: "success",
    });
  }

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
                <Switch checked={enabled} onCheckedChange={handleToggle} />
                Allow browser notifications
              </FieldLabel>
            </Field>
          </CardPanel>
        </Card>
      </CardFrame>
    </div>
  );
}
