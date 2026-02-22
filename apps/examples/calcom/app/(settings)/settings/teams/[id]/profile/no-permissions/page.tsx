import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";

import { CopyLink } from "./copy-link";

export default function TeamProfileNoPermissionsPage() {
  return (
    <CardFrame>
      <CardFrameHeader>
        <CardFrameTitle>Profile</CardFrameTitle>
        <CardFrameDescription>
          Manage settings for your team profile
        </CardFrameDescription>
      </CardFrameHeader>

      <Card>
        <CardPanel>
          <div className="flex flex-col gap-6">
            <div>
              <p className="font-semibold text-sm">Organization name</p>
              <p className="text-muted-foreground text-sm">Cal.com</p>
            </div>

            <div>
              <p className="font-semibold text-sm">Organization URL</p>
              <div className="flex items-center gap-1">
                <p className="text-muted-foreground text-sm">
                  https://cal.com/org/cal-com
                </p>
                <CopyLink />
              </div>
            </div>

            <div>
              <p className="font-semibold text-sm">About</p>
              <p className="text-muted-foreground text-sm">Makers of time.</p>
            </div>
          </div>
        </CardPanel>
      </Card>
    </CardFrame>
  );
}
