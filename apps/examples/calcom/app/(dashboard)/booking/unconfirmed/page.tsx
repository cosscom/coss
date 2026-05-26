import { BookingsList } from "../bookings-list";
import { BookingsNav } from "@/components/app/bookings-nav";
import { BookingsView } from "@/components/app/bookings-view";
import { mockUnconfirmedBookings } from "@/lib/mock-bookings-data";

export default function Page() {
  return (
    <>
      <div className="mb-6 flex justify-between gap-2 max-sm:flex-col sm:flex-wrap sm:items-center">
        <BookingsNav />
        <BookingsView />
      </div>
      {/* <BookingsFilters /> */}
      <div className="mt-4">
        <BookingsList
          bookings={mockUnconfirmedBookings}
          listingStatus="unconfirmed"
        />
      </div>
    </>
  );
}
