import { Card, CardFrame, CardPanel } from "@coss/ui/components/card";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";

import { ImpersonationToggle } from "./impersonation-toggle";

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
      <CardFrame>
        <Card>
          <CardPanel>
            <ImpersonationToggle />
          </CardPanel>
        </Card>
      </CardFrame>
    </>
  );
}
