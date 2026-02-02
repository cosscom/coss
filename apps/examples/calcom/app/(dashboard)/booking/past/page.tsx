import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";
import { BookingsFilters } from "@/components/app/bookings-filters";
import { BookingsNav } from "@/components/app/bookings-nav";
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

      <BookingsNav />

      <BookingsFilters />

      <BookingsList />
    </>
  );
}
