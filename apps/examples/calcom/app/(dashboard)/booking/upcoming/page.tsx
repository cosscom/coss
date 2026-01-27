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
} from "@/components/app/app-header";
import { useLoadingState } from "@/hooks/use-loading-state";
import { BookingsListSkeleton } from "../booking-skeleton";

const ARTIFICIAL_DELAY_MS = 400;

export default function Page() {
  const showLoading = useLoadingState(ARTIFICIAL_DELAY_MS);

  if (showLoading) {
    return (
      <>
        <AppHeader>
          <AppHeaderContent title="Upcoming Bookings">
            <AppHeaderDescription>
              View your upcoming booked events.
            </AppHeaderDescription>
          </AppHeaderContent>
        </AppHeader>

        <BookingsListSkeleton />
      </>
    );
  }

  return (
    <TooltipProvider delay={150} timeout={0}>
      <AppHeader>
        <AppHeaderContent title="Upcoming Bookings">
          <AppHeaderDescription>
            View your upcoming booked events.
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>

      <Empty className="rounded-xl border border-dashed md:py-32">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarIcon />
          </EmptyMedia>
          <EmptyTitle>No upcoming bookings</EmptyTitle>
          <EmptyDescription>
            You have no upcoming bookings found. As soon as someone books a time
            with you, it will show up here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </TooltipProvider>
  );
}
