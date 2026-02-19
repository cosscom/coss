"use client";

import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Fieldset, FieldsetLegend } from "@coss/ui/components/fieldset";
import {
  Select,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";

const addEventsToGroups = [
  {
    items: [
      {
        label: "example@cal.com",
        triggerLabel: "example@cal.com (Google - example@cal.com)",
        value: "google-example",
      },
      {
        label: "Team",
        triggerLabel: "Team (Google - example@cal.com)",
        value: "google-team",
      },
    ],
    label: "Google (example@cal.com)",
  },
];

const defaultReminderItems = [
  { label: "Use default reminders", value: "default" },
  { label: "Just in time", value: "0" },
  { label: "10 minutes before", value: "10" },
  { label: "30 minutes before", value: "30" },
  { label: "60 minutes before", value: "60" },
];

const allAddEventsToItems = addEventsToGroups.flatMap((g) => g.items);

export function CalendarsDemoForm() {
  return (
    <Fieldset className="max-w-none">
      <div>
        <FieldsetLegend>Add to calendar</FieldsetLegend>
        <p className="text-muted-foreground text-sm">
          Select where to add events when you're booked.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field>
          <FieldLabel>Add events to</FieldLabel>
          <Select
            aria-label="Add events to"
            defaultValue={allAddEventsToItems.find(
              (item) => item.value === "google-example",
            )}
            itemToStringValue={(item) => item.value}
          >
            <SelectTrigger>
              <SelectValue>
                {(item) => item?.triggerLabel ?? item?.label ?? ""}
              </SelectValue>
            </SelectTrigger>
            <SelectPopup>
              {addEventsToGroups.map((group) => (
                <SelectGroup key={group.label}>
                  <SelectGroupLabel>{group.label}</SelectGroupLabel>
                  {group.items.map((item) => (
                    <SelectItem key={item.value} value={item}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectPopup>
          </Select>
          <FieldDescription>
            You can override this on a per-event basis in the advanced settings
            in each event type.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel>Default reminder</FieldLabel>
          <Select
            aria-label="Default reminder"
            defaultValue="default"
            items={defaultReminderItems}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {defaultReminderItems.map(({ label, value }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <FieldDescription>
            Set the default reminder time for events added to your Google
            Calendar.
          </FieldDescription>
        </Field>
      </div>
    </Fieldset>
  );
}
