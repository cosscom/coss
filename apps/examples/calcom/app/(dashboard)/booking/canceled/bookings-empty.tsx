"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@coss/ui/components/empty";
import { CalendarIcon } from "lucide-react";
import { useLoadingState } from "@/hooks/use-loading-state";
import { BookingsListSkeleton } from "../booking-skeleton";

const ARTIFICIAL_DELAY_MS = 400;

export function BookingsEmpty() {
  const showLoading = useLoadingState(ARTIFICIAL_DELAY_MS);

  if (showLoading) {
    return <BookingsListSkeleton />;
  }

  return (
    <div className="mt-4">
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
    </div>
  );
}
