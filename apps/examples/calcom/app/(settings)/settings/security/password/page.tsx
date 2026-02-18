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
import { SettingsToggle } from "@/components/settings/settings-toggle";

import { PasswordFormFields } from "./password-form";

export default function PasswordSettingsPage() {
  return (
    <div className="space-y-4">
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Password</CardFrameTitle>
          <CardFrameDescription>
            Manage settings for your account passwords
          </CardFrameDescription>
        </CardFrameHeader>

        <Card className="rounded-b-none!">
          <CardPanel>
            <PasswordFormFields />
          </CardPanel>
        </Card>

        <CardFrameFooter className="flex justify-end">
          <Button disabled>Update</Button>
        </CardFrameFooter>
      </CardFrame>

      <SettingsToggle
        description="Invalidate your session after a certain amount of time."
        title="Session timeout"
      />
    </div>
  );
}
