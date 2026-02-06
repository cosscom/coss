"use client";

import { Button } from "@coss/ui/components/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@coss/ui/components/collapsible";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxValue,
} from "@coss/ui/components/combobox";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Group, GroupSeparator } from "@coss/ui/components/group";
import { Input } from "@coss/ui/components/input";
import {
  NumberField,
  NumberFieldGroup,
  NumberFieldInput,
} from "@coss/ui/components/number-field";
import { ScrollArea } from "@coss/ui/components/scroll-area";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";
import { Switch } from "@coss/ui/components/switch";
import { Textarea } from "@coss/ui/components/textarea";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const eventTriggerItems = [
  { label: "Booking canceled", value: "booking-canceled" },
  { label: "Booking created", value: "booking-created" },
  { label: "Booking rejected", value: "booking-rejected" },
  { label: "Booking requested", value: "booking-requested" },
  { label: "Booking payment initiated", value: "booking-payment-initiated" },
  { label: "Booking rescheduled", value: "booking-rescheduled" },
  { label: "Booking paid", value: "booking-paid" },
  { label: "Meeting ended", value: "meeting-ended" },
  { label: "Meeting started", value: "meeting-started" },
];

const timeUnitItems = [
  { label: "mins", value: "mins" },
  { label: "hours", value: "hours" },
  { label: "days", value: "days" },
];

const webhookVersionItems = [{ label: "2021-10-20", value: "2021-10-20" }];

const payloadVariables = [
  {
    description:
      "The name of the trigger event (e.g., BOOKING_CREATED, BOOKING_CANCELLED)",
    name: "triggerEvent",
  },
  { description: "The time of the webhook", name: "createdAt" },
  { description: "The event type slug", name: "type" },
  { description: "The event type name", name: "title" },
  { description: "The start time of the booking", name: "startTime" },
  { description: "The end time of the booking", name: "endTime" },
  { description: "List of attendee emails", name: "attendees" },
];

export function NewWebhookFormFields() {
  const [customPayloadOpen, setCustomPayloadOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <Field>
        <FieldLabel>Subscriber URL</FieldLabel>
        <Input placeholder="https://example.com/webhook" type="url" />
      </Field>

      <Field>
        <FieldLabel>
          <Switch defaultChecked />
          Enable webhook
        </FieldLabel>
      </Field>

      <Field>
        <FieldLabel>Event triggers</FieldLabel>
        <Combobox
          defaultValue={[eventTriggerItems[0], eventTriggerItems[1]]}
          items={eventTriggerItems}
          multiple
        >
          <ComboboxChips>
            <ComboboxValue>
              {(value: { value: string; label: string }[]) => (
                <>
                  {value?.map((item) => (
                    <ComboboxChip aria-label={item.label} key={item.value}>
                      {item.label}
                    </ComboboxChip>
                  ))}
                  <ComboboxChipsInput
                    aria-label="Select event triggers"
                    placeholder={
                      value.length > 0 ? undefined : "Select event triggers…"
                    }
                  />
                </>
              )}
            </ComboboxValue>
          </ComboboxChips>
          <ComboboxPopup>
            <ComboboxEmpty>No event triggers found.</ComboboxEmpty>
            <ComboboxList>
              {(item: { value: string; label: string }) => (
                <ComboboxItem key={item.value} value={item}>
                  {item.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxPopup>
        </Combobox>
      </Field>

      <Field>
        <FieldLabel>
          How long after the users don&apos;t show up on cal video meeting?
        </FieldLabel>
        <Group aria-label="How long after the users don't show up on cal video meeting?">
          <NumberField
            aria-label="Duration"
            className="gap-0"
            defaultValue={5}
            min={0}
            render={<NumberFieldGroup />}
          >
            <NumberFieldInput className="text-left" />
          </NumberField>
          <GroupSeparator />
          <Select defaultValue="mins" items={timeUnitItems}>
            <SelectTrigger className="w-fit min-w-none">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {timeUnitItems.map(({ label, value }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </Group>
      </Field>

      <Field>
        <FieldLabel>Secret</FieldLabel>
        <Input type="text" />
      </Field>

      <Field>
        <FieldLabel>Webhook version</FieldLabel>
        <div className="flex items-center gap-2">
          <Select
            aria-label="Webhook version"
            defaultValue="2021-10-20"
            items={webhookVersionItems}
          >
            <SelectTrigger className="w-fit min-w-none">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {webhookVersionItems.map(({ label, value }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>
        <FieldDescription className="flex items-center gap-1">
          <Link href="#">View payload docs for this version</Link>
          <ExternalLinkIcon aria-hidden="true" className="size-3" />
        </FieldDescription>
      </Field>

      <Collapsible onOpenChange={setCustomPayloadOpen} open={customPayloadOpen}>
        <Field>
          <FieldLabel>
            <CollapsibleTrigger
              render={
                <Switch
                  checked={customPayloadOpen}
                  onCheckedChange={setCustomPayloadOpen}
                />
              }
            />
            Custom Payload Template
          </FieldLabel>
        </Field>
        <CollapsiblePanel>
          <div className="mt-4 flex flex-col items-start gap-2">
            <Textarea placeholder={"{\n  \n}"} rows={4} />
            <Collapsible className="w-full">
              <CollapsibleTrigger
                render={<Button size="sm" variant="outline" />}
              >
                Show available variables
              </CollapsibleTrigger>
              <CollapsiblePanel>
                <ScrollArea
                  className="mt-4 h-64 rounded-lg border border-input"
                  scrollbarGutter
                  scrollFade
                >
                  <div className="p-2">
                    <p className="my-1 px-[calc(--spacing(2)+1px)] font-medium text-sm">
                      Event and booking
                    </p>
                    <ul>
                      {payloadVariables.map((variable) => (
                        <li key={variable.name}>
                          <Button
                            className="h-auto! w-full flex-col items-start gap-0.5 px-2 py-1.5 text-left"
                            variant="ghost"
                          >
                            <span className="font-mono text-xs">
                              {`{{${variable.name}}}`}
                            </span>
                            <span className="font-normal text-muted-foreground text-xs">
                              {variable.description}
                            </span>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </ScrollArea>
              </CollapsiblePanel>
            </Collapsible>
          </div>
        </CollapsiblePanel>
      </Collapsible>
    </div>
  );
}
