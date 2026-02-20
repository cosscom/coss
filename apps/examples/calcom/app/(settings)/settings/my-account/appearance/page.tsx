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
import { SettingsToggle } from "@/components/particles";

import { BookingThemeSection, DashboardThemeSection } from "./appearance-form";
import { BookingLayoutSection } from "./booking-layout-section";

export default function AppearanceSettingsPage() {
  return (
    <div className="space-y-4">
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Dashboard theme</CardFrameTitle>
          <CardFrameDescription>
            This only applies to your logged in dashboard
          </CardFrameDescription>
        </CardFrameHeader>

        <Card className="rounded-b-none!">
          <CardPanel>
            <DashboardThemeSection />
          </CardPanel>
        </Card>

        <CardFrameFooter className="flex justify-end">
          <Button disabled>Update</Button>
        </CardFrameFooter>
      </CardFrame>

      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Booking page theme</CardFrameTitle>
          <CardFrameDescription>
            This only applies to your public booking pages
          </CardFrameDescription>
        </CardFrameHeader>

        <Card className="rounded-b-none!">
          <CardPanel>
            <BookingThemeSection />
          </CardPanel>
        </Card>

        <CardFrameFooter className="flex justify-end">
          <Button disabled>Update</Button>
        </CardFrameFooter>
      </CardFrame>

      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Booking layout</CardFrameTitle>
          <CardFrameDescription>
            You can select multiple and bookers can switch views. This can be
            overridden on a per event basis.
          </CardFrameDescription>
        </CardFrameHeader>

        <Card className="rounded-b-none!">
          <CardPanel>
            <BookingLayoutSection />
          </CardPanel>
        </Card>

        <CardFrameFooter className="flex justify-end">
          <Button disabled>Update</Button>
        </CardFrameFooter>
      </CardFrame>

      <SettingsToggle
        description="Customize your own brand colour into your booking page."
        title="Custom brand colors"
      />

      <SettingsToggle
        description="Removes any Cal.com related brandings, i.e. 'Powered by Cal.com.'"
        title="Disable Cal.com branding"
      />

      <SettingsToggle
        description="Hide book a team member button from your public pages."
        title="Hide book a team member button"
      />

      <SettingsToggle
        description="Hide the team profile link on booking pages"
        title="Hide team profile link"
      />
    </div>
  );
}
