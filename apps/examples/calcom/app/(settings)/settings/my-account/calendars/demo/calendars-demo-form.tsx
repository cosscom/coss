"use client";

import { Field, FieldLabel } from "@coss/ui/components/field";
import { Fieldset, FieldsetLegend } from "@coss/ui/components/fieldset";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";

const addEventsToItems = [
  { label: "Google Calendar (personal@gmail.com)", value: "google-personal" },
  { label: "Google Calendar (work@company.com)", value: "google-work" },
  { label: "Outlook Calendar (user@outlook.com)", value: "outlook" },
  { label: "Apple Calendar (user@icloud.com)", value: "apple" },
];

const defaultReminderItems = [
  { label: "No reminder", value: "none" },
  { label: "5 minutes before", value: "5" },
  { label: "10 minutes before", value: "10" },
  { label: "15 minutes before", value: "15" },
  { label: "30 minutes before", value: "30" },
  { label: "1 hour before", value: "60" },
  { label: "2 hours before", value: "120" },
  { label: "1 day before", value: "1440" },
];

export function CalendarsDemoForm() {
  return (
    <Fieldset>
      <div>
        <FieldsetLegend className="font-medium text-sm">
          Add to calendar
        </FieldsetLegend>
        <p className="text-muted-foreground text-sm">
          Select where to add events when you're booked.
        </p>
      </div>

      <Field>
        <FieldLabel>Add events to</FieldLabel>
        <Select
          aria-label="Add events to"
          defaultValue="google-personal"
          items={addEventsToItems}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {addEventsToItems.map(({ label, value }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </Field>

      <Field>
        <FieldLabel>Default reminder</FieldLabel>
        <Select
          aria-label="Default reminder"
          defaultValue="10"
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
      </Field>
    </Fieldset>
  );
}
