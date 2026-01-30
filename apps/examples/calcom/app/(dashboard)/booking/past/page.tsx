"use client";

import { Button } from "@coss/ui/components/button";
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
import { ChevronsUpDownIcon, PlusIcon, SearchIcon } from "lucide-react";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";
import { BookingsFilters } from "@/components/app/bookings-filters";
import { BookingsNav } from "@/components/app/bookings-nav";
import { BookingsList } from "./bookings-list";

const presets = [
  { label: "Saved Filters", value: null },
  { label: "This Week", value: "this-week" },
  { label: "This Month", value: "this-month" },
  { label: "Last 30 Days", value: "last-30-days" },
  { label: "Last 90 Days", value: "last-90-days" },
];

export default function Page() {
  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Bookings">
          <AppHeaderDescription>
            See upcoming and past events booked through your event type links.
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>

      <div className="flex items-center justify-between gap-2">
        <BookingsNav />
        <div className="flex items-center gap-2">
          <BookingsFilters />
          <Combobox items={presets}>
            <ComboboxTrigger render={<Button variant="outline" />}>
              <ComboboxValue />
              <ChevronsUpDownIcon />
            </ComboboxTrigger>
            <ComboboxPopup align="end" aria-label="Select preset">
              <div className="border-b p-2">
                <ComboboxInput
                  className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
                  placeholder="e.g. This Week"
                  showTrigger={false}
                />
              </div>
              <ComboboxEmpty>No presets found.</ComboboxEmpty>
              <ComboboxList>
                {(preset: (typeof presets)[number]) => (
                  <ComboboxItem key={preset.value} value={preset}>
                    {preset.label}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxPopup>
          </Combobox>
          <Button aria-label="Add preset" size="icon" variant="outline">
            <PlusIcon />
          </Button>
        </div>
      </div>
      <BookingsList />
    </>
  );
}
