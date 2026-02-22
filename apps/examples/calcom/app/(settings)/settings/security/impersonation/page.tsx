import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";

import { ImpersonationToggle } from "./impersonation-toggle";

export default function ImpersonationSettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Impersonation</CardFrameTitle>
          <CardFrameDescription>
            Settings to manage user impersonation
          </CardFrameDescription>
        </CardFrameHeader>

        <Card>
          <CardPanel>
            <ImpersonationToggle />
          </CardPanel>
        </Card>
      </CardFrame>
    </div>
  );
}
