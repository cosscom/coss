"use client";

import { Button } from "@coss/ui/components/button";
import { SaveIcon, TrashIcon } from "lucide-react";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";
import { BookingsFilters } from "@/components/app/bookings-filters";
import { BookingsNav } from "@/components/app/bookings-nav";
import { BookingsSavedFilters } from "@/components/app/bookings-saved-filters";
import { BookingsList } from "./bookings-list";

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
          <BookingsSavedFilters />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2" />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost">
            <TrashIcon />
            Clear
          </Button>
          <Button size="sm" variant="outline">
            <SaveIcon />
            Save
          </Button>
        </div>
      </div>

      <BookingsList />
    </>
  );
}
