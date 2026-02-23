import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameFooter,
  CardPanel,
} from "@coss/ui/components/card";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";
import { DangerZoneSection } from "@/components/particles/danger-zone-section";

import { TeamProfileFields } from "./team-profile-form";

export default function TeamProfilePage() {
  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Profile">
          <AppHeaderDescription>
            Manage settings for your team profile
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <div className="flex flex-col gap-4">
        <CardFrame>
          <Card className="rounded-b-none!">
            <CardPanel>
              <TeamProfileFields />
            </CardPanel>
          </Card>

          <CardFrameFooter className="flex justify-end">
            <Button>Update</Button>
          </CardFrameFooter>
        </CardFrame>

        <DangerZoneSection
          buttonLabel="Disband team"
          description="Be careful. Team deletion cannot be undone."
        />
      </div>
    </>
  );
}
