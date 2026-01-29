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
import { BookingsNav } from "@/components/app/bookings-nav";
import { useLoadingState } from "@/hooks/use-loading-state";
import { BookingsListSkeleton } from "../booking-skeleton";

const ARTIFICIAL_DELAY_MS = 400;

export default function Page() {
  const showLoading = useLoadingState(ARTIFICIAL_DELAY_MS);

  if (showLoading) {
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
        <BookingsListSkeleton />
      </>
    );
  }

  return (
    <TooltipProvider delay={150} timeout={0}>
      <AppHeader>
        <AppHeaderContent title="Bookings">
          <AppHeaderDescription>
            See upcoming and past events booked through your event type links.
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>

      <BookingsNav />
      <Empty className="rounded-xl border border-dashed md:py-32">
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
