import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";
import { BookingsFilters } from "@/components/app/bookings-filters";
import { BookingsNav } from "@/components/app/bookings-nav";
import { BookingsView } from "@/components/app/bookings-view";
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

      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <BookingsNav />
        <BookingsView />
      </div>

      <BookingsFilters />

      <BookingsList />
    </>
  );
}
