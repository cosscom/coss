"use client";

import { useState } from "react";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";
import {
  type ActiveFilter,
  BookingsFilter,
} from "@/components/app/bookings-filter";
import { BookingsNav } from "@/components/app/bookings-nav";
import { BookingsSavedFilters } from "@/components/app/bookings-saved-filters";
import { BookingsList } from "./bookings-list";

export default function Page() {
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Bookings">
          <AppHeaderDescription>
            See upcoming and past events booked through your event type links.
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>

      <BookingsNav />

      <BookingsFilter
        activeFilters={activeFilters}
        onFiltersChange={setActiveFilters}
        savedFiltersSlot={<BookingsSavedFilters />}
      />

      <BookingsList />
    </>
  );
}
