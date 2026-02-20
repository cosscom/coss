"use client";

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
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";
import { useState } from "react";
import { SettingsToggle } from "@/components/particles";

const resetIntervalItems = [
  { label: "Daily", value: "daily" },
  { label: "Monthly", value: "monthly" },
];

const distributionBasisItems = [
  { label: "Booking creation time", value: "booking-creation-time" },
  { label: "Meeting start time", value: "event-start-time" },
];

export function TeamSettingsPageClient() {
  const [resetInterval, setResetInterval] = useState("monthly");
  const [distributionBasis, setDistributionBasis] = useState(
    "booking-creation-time",
  );

  return (
    <div className="flex flex-col gap-4">
      <SettingsToggle
        description="Limit how many times members can be booked across all team event types"
        title="Limit booking frequency"
      />

      <SettingsToggle
        defaultChecked
        description="Allows your team Owners/Admins to temporarily sign in as you."
        title="User impersonation"
      />

      <SettingsToggle
        description="Your team members won't be able to see other team members when this is turned on."
        title="Make team private"
      />

      <SettingsToggle
        description="Create presets for internal notes that can be applied to bookings"
        title="Internal cancellation notes presets"
      />

      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Round robin</CardFrameTitle>
          <CardFrameDescription>
            Customize the default round robin settings for this team
          </CardFrameDescription>
        </CardFrameHeader>

        <Card className="rounded-b-none!">
          <CardPanel>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field>
                <FieldLabel>Reset interval for weighted Round Robin</FieldLabel>
                <Select
                  items={resetIntervalItems}
                  onValueChange={(value) => value && setResetInterval(value)}
                  value={resetInterval}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {resetIntervalItems.map(({ label, value }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
                <FieldDescription>
                  Determines how often the round robin booking count resets to
                  ensure balanced distribution.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>
                  Distribution basis for weighted Round Robin
                </FieldLabel>
                <Select
                  items={distributionBasisItems}
                  onValueChange={(value) =>
                    value && setDistributionBasis(value)
                  }
                  value={distributionBasis}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {distributionBasisItems.map(({ label, value }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
                <FieldDescription>
                  Determines which event timestamp is used as the basis for
                  weighted round robin distribution.
                </FieldDescription>
              </Field>
            </div>
          </CardPanel>
        </Card>

        <CardFrameFooter className="flex justify-end">
          <Button disabled>Update</Button>
        </CardFrameFooter>
      </CardFrame>
    </div>
  );
}
