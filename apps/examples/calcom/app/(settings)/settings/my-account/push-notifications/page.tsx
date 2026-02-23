import { Card, CardFrame, CardPanel } from "@coss/ui/components/card";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";

import { PushNotificationsToggle } from "./push-notifications-toggle";

export default function PushNotificationsPage() {
  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Push notifications">
          <AppHeaderDescription>
            Receive push notifications when booker submits instant meeting
            booking.
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <CardFrame>
        <Card>
          <CardPanel>
            <PushNotificationsToggle />
          </CardPanel>
        </Card>
      </CardFrame>
    </>
  );
}
