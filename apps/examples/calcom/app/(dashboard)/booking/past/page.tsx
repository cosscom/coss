import { Button } from "@coss/ui/components/button";
import { CalendarIcon, FilterIcon } from "lucide-react";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";
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

      <div className="mb-4 flex gap-2">
        <Button variant="outline">
          <FilterIcon />
          Filter
        </Button>
        <Button variant="outline">
          <CalendarIcon />
          Saved
        </Button>
      </div>

      <BookingsList />
    </>
  );
}
