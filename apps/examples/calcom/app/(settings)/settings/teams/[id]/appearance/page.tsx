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
import { BookingThemeSection } from "@/app/(settings)/settings/my-account/appearance/appearance-form";
import { CustomBrandColorsSection } from "@/app/(settings)/settings/my-account/appearance/custom-brand-colors-section";
import { SettingsToggle } from "@/components/particles";

export default function TeamAppearancePage() {
  return (
    <div className="flex flex-col gap-4">
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
          <CardFrameTitle>Custom brand colors</CardFrameTitle>
          <CardFrameDescription>
            Customize your own brand colour into your booking page.
          </CardFrameDescription>
        </CardFrameHeader>

        <Card className="rounded-b-none!">
          <CardPanel>
            <CustomBrandColorsSection />
          </CardPanel>
        </Card>

        <CardFrameFooter className="flex justify-end">
          <Button disabled>Update</Button>
        </CardFrameFooter>
      </CardFrame>

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
