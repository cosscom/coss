import { ScrollArea } from "@coss/ui/components/scroll-area";
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
    <ScrollArea scrollbarGutter scrollFade>
      <TabbedNav
        ariaLabel="Filter bookings"
        data-slot="bookings-nav"
        tabs={bookingTabs}
      />
    </ScrollArea>
  );
}

export { BookingsNav };
