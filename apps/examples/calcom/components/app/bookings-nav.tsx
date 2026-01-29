"use client";

import { cn } from "@coss/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const bookingTabs = [
  { title: "Upcoming", url: "/booking/upcoming" },
  { title: "Unconfirmed", url: "/booking/unconfirmed" },
  { title: "Recurring", url: "/booking/recurring" },
  { title: "Past", url: "/booking/past" },
  { title: "Canceled", url: "/booking/canceled" },
];

function BookingsNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Filter bookings"
      className="mb-6 flex w-fit items-center gap-x-0.5 rounded-lg bg-muted p-0.5 text-muted-foreground/72"
      data-slot="bookings-nav"
    >
      {bookingTabs.map((tab) => {
        const isActive = pathname === tab.url;
        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex h-7 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 font-medium text-sm outline-none transition-[color,background-color,box-shadow] not-aria-[current=page]:hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-sm/5 dark:aria-[current=page]:bg-input",
            )}
            href={tab.url}
            key={tab.url}
          >
            {tab.title}
          </Link>
        );
      })}
    </nav>
  );
}

export { BookingsNav };
