import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameFooter,
  CardPanel,
} from "@coss/ui/components/card";
import { TeamProfileFields } from "./team-profile-form";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";
import { DangerZone } from "@/components/particles/danger-zone";

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

        <DangerZone
          buttonLabel="Disband team"
          description="Be careful. Team deletion cannot be undone."
        />
      </div>
    </>
  );
}
