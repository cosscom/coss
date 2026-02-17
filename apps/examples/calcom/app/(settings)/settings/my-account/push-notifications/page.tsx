import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";

import { PushNotificationsToggle } from "./push-notifications-toggle";

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

        <Card>
          <CardPanel>
            <PushNotificationsToggle />
          </CardPanel>
        </Card>
      </CardFrame>
    </div>
  );
}
