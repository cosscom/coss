import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";
import { SettingsToggle } from "@/components/particles";

export default function ImpersonationSettingsPage() {
  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Impersonation">
          <AppHeaderDescription>
            Settings to manage user impersonation
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <SettingsToggle
        description="Allows our support team to temporarily sign in as you to help us quickly resolve any issues you report to us."
        title="User impersonation"
      />
    </>
  );
}
