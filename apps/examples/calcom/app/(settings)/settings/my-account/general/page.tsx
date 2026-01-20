"use client";

import { Button } from "@coss/ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@coss/ui/components/frame";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";
import { Switch } from "@coss/ui/components/switch";
import { CalendarIcon } from "lucide-react";

export default function GeneralSettingsPage() {
  return (
    <div className="space-y-4">
      <Frame>
        <FramePanel>
          <FrameHeader>
            <FrameTitle className="text-xl">General</FrameTitle>
            <FrameDescription>
              Manage settings for your language and timezone
            </FrameDescription>
          </FrameHeader>
        </FramePanel>

        <FramePanel>
          <div className="space-y-5">
            <Field>
              <FieldLabel>Language</FieldLabel>
              <Select defaultValue="en">
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                </SelectPopup>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Timezone</FieldLabel>
              <div className="flex gap-2">
                <Select defaultValue="europe-rome">
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectPopup>
                    <SelectItem value="europe-rome">Europe/Rome</SelectItem>
                    <SelectItem value="america-new-york">
                      America/New_York
                    </SelectItem>
                    <SelectItem value="america-los-angeles">
                      America/Los_Angeles
                    </SelectItem>
                    <SelectItem value="europe-london">Europe/London</SelectItem>
                    <SelectItem value="asia-tokyo">Asia/Tokyo</SelectItem>
                  </SelectPopup>
                </Select>
                <Button variant="outline">
                  <CalendarIcon />
                  <span>Schedule timezone change</span>
                </Button>
              </div>
            </Field>

            <Field>
              <FieldLabel>Time format</FieldLabel>
              <Select defaultValue="12">
                <SelectTrigger>
                  <SelectValue placeholder="Select time format" />
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value="12">12-hour</SelectItem>
                  <SelectItem value="24">24-hour</SelectItem>
                </SelectPopup>
              </Select>
              <FieldDescription>
                This is an internal setting and will not affect how times are
                displayed on public booking pages for you or anyone booking you.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Start of week</FieldLabel>
              <Select defaultValue="sunday">
                <SelectTrigger>
                  <SelectValue placeholder="Select start of week" />
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value="sunday">Sunday</SelectItem>
                  <SelectItem value="monday">Monday</SelectItem>
                  <SelectItem value="saturday">Saturday</SelectItem>
                </SelectPopup>
              </Select>
            </Field>
          </div>

          <FrameFooter className="mt-6 flex-row items-center justify-end border-t pt-4">
            <Button>Update</Button>
          </FrameFooter>
        </FramePanel>
      </Frame>

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

function SettingsToggle({
  title,
  description,
  defaultChecked = false,
}: {
  title: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <Frame>
      <FramePanel>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <FrameTitle>{title}</FrameTitle>
            <FrameDescription>{description}</FrameDescription>
          </div>
          <Switch defaultChecked={defaultChecked} />
        </div>
      </FramePanel>
    </Frame>
  );
}
