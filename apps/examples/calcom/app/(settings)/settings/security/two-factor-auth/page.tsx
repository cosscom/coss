import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";

import { TwoFactorAuthSection } from "./two-factor-auth-section";

export default function TwoFactorAuthSettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Two-factor authentication</CardFrameTitle>
          <CardFrameDescription>
            Set up your two-factor authentication.
          </CardFrameDescription>
        </CardFrameHeader>

        <Card>
          <CardPanel>
            <TwoFactorAuthSection />
          </CardPanel>
        </Card>
      </CardFrame>
    </div>
  );
}
