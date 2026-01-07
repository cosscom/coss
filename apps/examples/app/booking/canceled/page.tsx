"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@coss/ui/components/empty";
import { TooltipProvider } from "@coss/ui/components/tooltip";
import { CalendarIcon } from "lucide-react";

import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app-header";

export default function Page() {
  return (
    <TooltipProvider delay={150} timeout={0}>
      <AppHeader>
        <AppHeaderContent title="Canceled Bookings">
          <AppHeaderDescription>
            View bookings that have been canceled.
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>

      <Empty className="rounded-xl border border-dashed md:py-24">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarIcon />
          </EmptyMedia>
          <EmptyTitle>No canceled bookings</EmptyTitle>
          <EmptyDescription>
            You have no canceled bookings found. Canceled bookings will appear
            here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </TooltipProvider>
  );
}
