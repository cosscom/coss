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

import { OrganizationProfileFields } from "./organization-profile-form";

export default function OrganizationProfilePage() {
  return (
    <div className="flex flex-col gap-4">
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Profile</CardFrameTitle>
          <CardFrameDescription>
            Manage settings for your team profile
          </CardFrameDescription>
        </CardFrameHeader>

        <Card className="rounded-b-none!">
          <CardPanel>
            <OrganizationProfileFields />
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
  );
}
