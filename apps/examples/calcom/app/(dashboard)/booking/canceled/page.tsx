"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@coss/ui/components/empty";
import { CalendarIcon } from "lucide-react";
import { BookingsFilters } from "@/components/app/bookings-filters";
import { BookingsNav } from "@/components/app/bookings-nav";
import { BookingsView } from "@/components/app/bookings-view";
import { useLoadingState } from "@/hooks/use-loading-state";
import { BookingsListSkeleton } from "../booking-skeleton";

const ARTIFICIAL_DELAY_MS = 400;

export default function Page() {
  const showLoading = useLoadingState(ARTIFICIAL_DELAY_MS);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <BookingsNav />
        <BookingsView />
      </div>
      <BookingsFilters />
      {showLoading ? (
        <BookingsListSkeleton />
      ) : (
        <div className="mt-4">
          <Empty className="rounded-xl border border-dashed md:py-32">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarIcon />
              </EmptyMedia>
              <EmptyTitle>No canceled bookings</EmptyTitle>
              <EmptyDescription>
                You have no canceled bookings found. Canceled bookings will
                appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      )}
    </>
  );
}
