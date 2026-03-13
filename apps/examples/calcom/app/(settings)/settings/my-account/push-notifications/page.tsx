import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";
import { SettingsToggle } from "@/components/particles";

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
      <SettingsToggle
        description="Allow browser notifications"
        title="Enable push notifications"
      />
    </>
  );
}
