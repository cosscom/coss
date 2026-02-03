"use client";

import { TabbedNav } from "@/components/app/tabbed-nav";

const bookingTabs = [
  { title: "Upcoming", url: "/booking/upcoming" },
  { title: "Unconfirmed", url: "/booking/unconfirmed" },
  { title: "Recurring", url: "/booking/recurring" },
  { title: "Past", url: "/booking/past" },
  { title: "Canceled", url: "/booking/canceled" },
];

function BookingsNav() {
  return (
    <TabbedNav
      ariaLabel="Filter bookings"
      className="max-md:hidden"
      dataSlot="bookings-nav"
      tabs={bookingTabs}
    />
  );
}

export { BookingsNav };
