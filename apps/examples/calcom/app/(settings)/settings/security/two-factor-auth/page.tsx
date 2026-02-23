import { Card, CardFrame, CardPanel } from "@coss/ui/components/card";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";

import { TwoFactorAuthSection } from "./two-factor-auth-section";

export default function TwoFactorAuthSettingsPage() {
  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Two-factor authentication">
          <AppHeaderDescription>
            Set up your two-factor authentication.
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <CardFrame>
        <Card>
          <CardPanel>
            <TwoFactorAuthSection />
          </CardPanel>
        </Card>
      </CardFrame>
    </>
  );
}
