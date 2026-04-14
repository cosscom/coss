import { BookingsList } from "./bookings-list";
import { BookingsFilters } from "@/components/app/bookings-filters";
import { BookingsNav } from "@/components/app/bookings-nav";
import { BookingsView } from "@/components/app/bookings-view";

export default function Page() {
  return (
    <>
      <div className="mb-6 flex justify-between gap-2 max-sm:flex-col sm:flex-wrap sm:items-center">
        <BookingsNav />
        <BookingsView className="max-md:hidden" />
      </div>
      <BookingsFilters />
      <div className="mt-4">
        <BookingsList />
      </div>
    </>
  );
}
