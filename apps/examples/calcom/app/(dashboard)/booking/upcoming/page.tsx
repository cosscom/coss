"use client";

import { Button } from "@coss/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@coss/ui/components/empty";
import { TooltipProvider } from "@coss/ui/components/tooltip";
import { CalendarIcon, SaveIcon } from "lucide-react";
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

  return (
    <TooltipProvider delay={150} timeout={0}>
      <AppHeader>
        <AppHeaderContent title="Bookings">
          <AppHeaderDescription>
            See upcoming and past events booked through your event type links.
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <BookingsNav />
      </div>

      <div className="mb-4 flex items-center justify-between gap-2">
        <Button variant="outline">
          <SaveIcon />
          Saved Filters
        </Button>
      </div>

      {showLoading ? (
        <BookingsListSkeleton />
      ) : (
        <Empty className="rounded-xl border border-dashed md:py-32">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarIcon />
            </EmptyMedia>
            <EmptyTitle>No upcoming bookings</EmptyTitle>
            <EmptyDescription>
              You have no upcoming bookings found. As soon as someone books a
              time with you, it will show up here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </TooltipProvider>
  );
}
