import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameFooter,
  CardPanel,
} from "@coss/ui/components/card";
import { PasswordFormFields } from "./password-form";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";
import { SettingsToggle } from "@/components/particles";

export default function PasswordSettingsPage() {
  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Password">
          <AppHeaderDescription>
            Manage settings for your account passwords
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <div className="flex flex-col gap-4">
        <CardFrame>
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
    </>
  );
}
