"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@coss/ui/components/empty";
import { CalendarIcon } from "lucide-react";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";
import { BookingsFilters } from "@/components/app/bookings-filters";
import { BookingsNav } from "@/components/app/bookings-nav";
import { BookingsView } from "@/components/app/bookings-view";
import { useLoadingState } from "@/hooks/use-loading-state";
import { BookingsListSkeleton } from "../booking-skeleton";

const ARTIFICIAL_DELAY_MS = 300;

export default function Page() {
  const showLoading = useLoadingState(ARTIFICIAL_DELAY_MS);

  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Bookings">
          <AppHeaderDescription>
            See upcoming and past events booked through your event type links.
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <BookingsNav />
        <BookingsView />
      </div>

      <BookingsFilters />

      {showLoading ? (
        <BookingsListSkeleton />
      ) : (
        <Empty className="rounded-xl border border-dashed md:py-32">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarIcon />
            </EmptyMedia>
            <EmptyTitle>No recurring bookings</EmptyTitle>
            <EmptyDescription>
              You have no recurring bookings found. Recurring booking series
              will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </>
  );
}
