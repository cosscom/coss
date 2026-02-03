"use client";

import { CalendarIcon, LayoutListIcon } from "lucide-react";
import { usePathname } from "next/navigation";

import { TabbedNav } from "@/components/app/tabbed-nav";

function BookingsView() {
  const pathname = usePathname();

  const viewTabs = [
    {
      icon: <LayoutListIcon className="size-4" />,
      title: "List view",
      url: pathname,
    },
    {
      icon: <CalendarIcon className="size-4" />,
      title: "Calendar view",
      url: `${pathname}?view=calendar`,
    },
  ];

  return <TabbedNav ariaLabel="View type" tabs={viewTabs} />;
}

export { BookingsView };
