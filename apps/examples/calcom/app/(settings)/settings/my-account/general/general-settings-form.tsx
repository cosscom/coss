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
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxTrigger,
  ComboboxValue,
} from "@coss/ui/components/combobox";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Fieldset, FieldsetLegend } from "@coss/ui/components/fieldset";
import { Label } from "@coss/ui/components/label";
import {
  Select,
  SelectButton,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";
import { CalendarIcon, SearchIcon } from "lucide-react";
import { useMemo } from "react";
import { SettingsToggle } from "@/components/settings/settings-toggle";

export function GeneralSettingsForm() {
  const languageItems = [
    { label: "English", value: "en" },
    { label: "Spanish", value: "es" },
    { label: "French", value: "fr" },
    { label: "German", value: "de" },
    { label: "Italian", value: "it" },
  ];

  const timezones = Intl.supportedValuesOf("timeZone");

  const formattedTimezones = useMemo(() => {
    return timezones
      .map((timezone) => {
        const formatter = new Intl.DateTimeFormat("en", {
          timeZone: timezone,
          timeZoneName: "shortOffset",
        });
        const parts = formatter.formatToParts(new Date());
        const offset =
          parts.find((part) => part.type === "timeZoneName")?.value || "";
        const modifiedOffset = offset === "GMT" ? "GMT+0" : offset;

        const offsetMatch = offset.match(/GMT([+-]?)(\d+)(?::(\d+))?/);
        const sign = offsetMatch?.[1] === "-" ? -1 : 1;
        const hours = Number.parseInt(offsetMatch?.[2] || "0", 10);
        const minutes = Number.parseInt(offsetMatch?.[3] || "0", 10);
        const totalMinutes = sign * (hours * 60 + minutes);

        return {
          label: `(${modifiedOffset}) ${timezone.replace(/_/g, " ")}`,
          numericOffset: totalMinutes,
          value: timezone,
        };
      })
      .sort((a, b) => a.numericOffset - b.numericOffset);
  }, [timezones]);

  const defaultTimezone =
    formattedTimezones.find((tz) => tz.value === "Europe/Rome") ??
    formattedTimezones[0];

  const timeFormatItems = [
    { label: "12-hour", value: "12" },
    { label: "24-hour", value: "24" },
  ];

  const startOfWeekItems = [
    { label: "Sunday", value: "sunday" },
    { label: "Monday", value: "monday" },
    { label: "Tuesday", value: "tuesday" },
    { label: "Wednesday", value: "wednesday" },
    { label: "Thursday", value: "thursday" },
    { label: "Friday", value: "friday" },
    { label: "Saturday", value: "saturday" },
  ];

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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field className="max-md:col-span-2">
                <FieldLabel>Language</FieldLabel>
                <Select
                  aria-label="Language"
                  defaultValue="en"
                  items={languageItems}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {languageItems.map(({ label, value }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </Field>

              <div className="col-span-2">
                <Fieldset className="max-w-none gap-2">
                  <Label render={<FieldsetLegend />}>Timezone</Label>
                  <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
                    <Field className="contents">
                      <Combobox
                        autoHighlight
                        defaultValue={defaultTimezone}
                        items={formattedTimezones}
                      >
                        <ComboboxTrigger render={<SelectButton />}>
                          <ComboboxValue />
                        </ComboboxTrigger>
                        <ComboboxPopup aria-label="Select timezone">
                          <div className="border-b p-2">
                            <ComboboxInput
                              className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
                              placeholder="e.g. Europe/Rome"
                              showTrigger={false}
                              startAddon={<SearchIcon />}
                            />
                          </div>
                          <ComboboxEmpty>No timezones found.</ComboboxEmpty>
                          <ComboboxList>
                            {(item) => (
                              <ComboboxItem key={item.value} value={item}>
                                {item.label}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxPopup>
                      </Combobox>
                    </Field>
                    <Button variant="outline">
                      <CalendarIcon />
                      <span>Schedule timezone change</span>
                    </Button>
                  </div>
                </Fieldset>
              </div>

              <div className="col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Time format</FieldLabel>
                  <Select
                    aria-label="Time format"
                    defaultValue="12"
                    items={timeFormatItems}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopup>
                      {timeFormatItems.map(({ label, value }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                  <FieldDescription>
                    This is an internal setting and will not affect how times
                    are displayed on public booking pages for you or anyone
                    booking you.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel>Start of week</FieldLabel>
                  <Select
                    aria-label="Start of week"
                    defaultValue="sunday"
                    items={startOfWeekItems}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopup>
                      {startOfWeekItems.map(({ label, value }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                </Field>
              </div>
            </div>
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
