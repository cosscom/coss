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
import { AppearanceForm } from "./appearance-form";

export default function AppearanceSettingsPage() {
  return (
    <CardFrame>
      <CardFrameHeader>
        <CardFrameTitle>Appearance</CardFrameTitle>
        <CardFrameDescription>
          Manage settings for your booking appearance
        </CardFrameDescription>
      </CardFrameHeader>

      <Card className="rounded-b-none!">
        <CardPanel>
          <AppearanceForm />
        </CardPanel>
      </Card>

      <CardFrameFooter className="flex justify-end">
        <Button>Update</Button>
      </CardFrameFooter>
    </CardFrame>
  );
}
