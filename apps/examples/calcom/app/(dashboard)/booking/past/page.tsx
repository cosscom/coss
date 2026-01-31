"use client";

import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";
import { BookingsNav } from "@/components/app/bookings-nav";
import { BookingsSavedFilters } from "@/components/app/bookings-saved-filters";
import { BookingsList } from "./bookings-list";
import { BookingsFilter } from "@/components/app/bookings-filter";

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
          <BookingsSavedFilters />
        </div>
      </div>

      <BookingsFilter />

      <BookingsList />
    </>
  );
}
