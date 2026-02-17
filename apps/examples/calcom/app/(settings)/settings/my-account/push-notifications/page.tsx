"use client";

import {
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
} from "@coss/ui/components/card";
import { SettingsToggle } from "@/components/settings/settings-toggle";

export default function PushNotificationsPage() {
  return (
    <div className="space-y-4">
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Push notifications</CardFrameTitle>
          <CardFrameDescription>
            Manage your browser push notification preferences
          </CardFrameDescription>
        </CardFrameHeader>
      </CardFrame>

      <SettingsToggle
        description="Receive push notifications when booker submits instant meeting booking."
        title="Allow browser notifications"
      />
    </div>
  );
}
