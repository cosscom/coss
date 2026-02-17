import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";

import { CopyLinkButton } from "./copy-link-button";

export default function OrganizationProfileNoPermissionsPage() {
  return (
    <CardFrame>
      <CardFrameHeader>
        <CardFrameTitle>Profile</CardFrameTitle>
        <CardFrameDescription>
          Manage settings for your organization profile
        </CardFrameDescription>
      </CardFrameHeader>

      <Card>
        <CardPanel>
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-sm">Organization name</p>
                <p className="text-sm">Cal.com</p>
              </div>
              <CopyLinkButton />
            </div>

            <div className="flex flex-col gap-1">
              <p className="font-semibold text-sm">About</p>
              <p className="text-muted-foreground text-sm">Makers of time.</p>
            </div>
          </div>
        </CardPanel>
      </Card>
    </CardFrame>
  );
}
