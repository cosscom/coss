"use client";

import { Button } from "@coss/ui/components/button";
import { Field, FieldError, FieldLabel } from "@coss/ui/components/field";
import { Form } from "@coss/ui/components/form";
import { Input } from "@coss/ui/components/input";
import { type CalEvent, createConstraints, Kloq, localZone, slotAllowed, useIsClient } from "kloq";
import { useMemo, useState } from "react";
import { Nav } from "../parts";
import {
  asDraft,
  busyCalendar,
  confirmBooking,
  DRAFT_ID,
  draftBooking,
  HOST,
  hostConstraints,
  whenLabel,
} from "./data";

// the confirm card beside the grid is the panel; the built-in editor never opens
const SLOTS = { EventPanel: () => null };

export default function BookingPageExample() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [busy] = useState(() => busyCalendar());
  const [booked, setBooked] = useState<CalEvent | null>(null);
  const draft = events.find((e) => e.id === DRAFT_ID);

  const constraints = useMemo(() => hostConstraints(busy, events), [busy, events]);

  const onEventsChange = (next: CalEvent[]) => {
    const confirmed = next.filter((e) => e.readOnly);
    const proposed = next.filter((e) => !e.readOnly).at(-1);
    setEvents(proposed ? [...confirmed, asDraft(proposed)] : confirmed);
  };

  const propose = ({ start }: { start: Date }) => {
    const end = new Date(start.getTime() + HOST.minutes * 60_000);
    // a 30-minute call has to fit, not just the slot that was clicked
    if (!slotAllowed(createConstraints(constraints), { start, end, allDay: false })) return;
    setBooked(null);
    setEvents((prev) => [...prev.filter((e) => e.readOnly), draftBooking(start, end)]);
  };

  const confirm = (guest: Record<string, string>) => {
    if (!draft) return;
    const booking = confirmBooking(draft, { name: guest.name, email: guest.email });
    setEvents((prev) => [...prev.filter((e) => e.id !== DRAFT_ID), booking]);
    setBooked(booking);
  };

  return (
    <div className="@container flex flex-col">
      <div className="flex flex-col @2xl:h-136 @2xl:flex-row">
        <aside className="flex shrink-0 flex-col gap-5 border-b p-4 @2xl:w-64 @2xl:border-r @2xl:border-b-0">
          <Host />
          {booked ? (
            <div className="flex flex-col gap-2 border-t pt-4">
              <p className="font-mono text-xs text-muted-foreground">confirmed</p>
              <p className="text-sm font-medium">{booked.title}</p>
              <p className="font-mono text-xs text-muted-foreground tabular-nums">
                {whenLabel(booked)}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 self-start"
                onClick={() => setBooked(null)}
              >
                Book another
              </Button>
            </div>
          ) : draft ? (
            <Form className="flex flex-col gap-3 border-t pt-4" onFormSubmit={confirm}>
              <p className="font-mono text-xs text-muted-foreground tabular-nums">
                {whenLabel(draft)}
              </p>
              <Field name="name" className="items-stretch">
                <FieldLabel>Name</FieldLabel>
                <Input autoComplete="name" required size="sm" />
                <FieldError />
              </Field>
              <Field name="email" className="items-stretch">
                <FieldLabel>Email</FieldLabel>
                <Input type="email" autoComplete="email" required size="sm" />
                <FieldError />
              </Field>
              <div className="flex items-center gap-2">
                <Button type="submit" size="sm">
                  Confirm
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEvents((prev) => prev.filter((e) => e.readOnly))}
                >
                  Cancel
                </Button>
              </div>
            </Form>
          ) : (
            <p className="border-t pt-4 text-sm text-muted-foreground">
              Click a free slot. The hatched time is busy — the grid refuses it. Drag the green
              block to adjust.
            </p>
          )}
        </aside>

        <div className="h-112 min-w-0 shrink-0 @2xl:h-auto @2xl:flex-1">
          <Kloq
            view={3}
            responsive={false}
            dayStartHour={9}
            dayEndHour={18}
            snapMinutes={30}
            minEventMinutes={30}
            workingHours={HOST.hours}
            constraints={constraints}
            events={events}
            onEventsChange={onEventsChange}
            onSlotClick={propose}
            components={SLOTS}
            persistence={false}
            designMode={false}
            storage={false}
          >
            <Kloq.Toolbar>
              <Nav />
              <span className="font-mono text-xs text-muted-foreground">
                {HOST.minutes}-min slots
              </span>
            </Kloq.Toolbar>
          </Kloq>
        </div>
      </div>
    </div>
  );
}

function Host() {
  const isClient = useIsClient();
  return (
    <div>
      <p className="font-mono text-xs text-muted-foreground">book a call with</p>
      <p className="mt-1 font-heading text-lg font-semibold tracking-tight">{HOST.name}</p>
      <p className="text-sm text-muted-foreground">
        {HOST.title} · {HOST.minutes} min
      </p>
      <p className="mt-2 font-mono text-xs text-muted-foreground">{isClient ? localZone() : " "}</p>
    </div>
  );
}
