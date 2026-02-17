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

import { GeneralSettingsFields } from "./general-settings-form";

export default function GeneralSettingsPage() {
  return (
    <div className="space-y-4">
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>General</CardFrameTitle>
          <CardFrameDescription>
            Manage settings for your language and timezone
          </CardFrameDescription>
        </CardFrameHeader>

        <Card className="rounded-b-none!">
          <CardPanel>
            <GeneralSettingsFields />
          </CardPanel>
        </Card>

        <CardFrameFooter className="flex justify-end">
          <Button>Update</Button>
        </CardFrameFooter>
      </CardFrame>

      <SettingsToggle
        defaultChecked
        description="Allow attendees to book you through dynamic group bookings"
        title="Dynamic group links"
      />

      <SettingsToggle
        defaultChecked
        description="Allow search engines to access your public content"
        title="Allow search engine indexing"
      />

      <SettingsToggle
        defaultChecked
        description="Monthly digest email for teams"
        title="Monthly digest email"
      />

      <SettingsToggle
        description="When enabled, anyone trying to book events using your email address must verify they own it via a one time code or be logged in to prevent impersonation"
        title="Prevent impersonation on bookings"
      />
    </div>
  );
}
