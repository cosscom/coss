"use client";

import { CalendarIcon, LayoutListIcon } from "lucide-react";

import { TabbedNav } from "@/components/app/tabbed-nav";

const viewTabs = [
  {
    icon: <LayoutListIcon className="size-4" />,
    title: "List view",
    url: "/booking/past",
  },
  {
    icon: <CalendarIcon className="size-4" />,
    title: "Calendar view",
    url: "/booking/past?view=calendar",
  },
];

function BookingsView() {
  return <TabbedNav ariaLabel="View type" tabs={viewTabs} />;
}

export { BookingsView };
