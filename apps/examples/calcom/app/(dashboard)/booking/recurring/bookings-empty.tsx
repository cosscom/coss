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

const ARTIFICIAL_DELAY_MS = 300;

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
          <EmptyTitle>No recurring bookings</EmptyTitle>
          <EmptyDescription>
            You have no recurring bookings found. Recurring booking series will
            appear here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
