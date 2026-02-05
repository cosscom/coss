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
    <div className="max-sm:-mx-4 max-sm:-my-0.5">
      <ScrollArea scrollbarGutter scrollFade>
        <div className="w-fit max-sm:px-4 max-sm:py-0.5">
          <TabbedNav
            ariaLabel="Filter bookings"
            data-slot="bookings-nav"
            tabs={bookingTabs}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

export { BookingsNav };
