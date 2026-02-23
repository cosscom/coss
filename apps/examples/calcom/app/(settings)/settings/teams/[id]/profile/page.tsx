import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameFooter,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";

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

        <CardFrame className="flex-row items-center justify-between">
          <CardFrameHeader>
            <CardFrameTitle>Danger zone</CardFrameTitle>
            <CardFrameDescription>
              Be careful. Team deletion cannot be undone.
            </CardFrameDescription>
          </CardFrameHeader>

          <CardFrameFooter className="flex justify-end">
            <Button variant="destructive-outline">Disband team</Button>
          </CardFrameFooter>
        </CardFrame>
      </div>
    </>
  );
}
