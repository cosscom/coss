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
          <AppHeaderContent title="Unconfirmed Bookings">
            <AppHeaderDescription>
              View bookings that are awaiting confirmation.
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
        <AppHeaderContent title="Unconfirmed Bookings">
          <AppHeaderDescription>
            View bookings that are awaiting confirmation.
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>

      <Empty className="rounded-xl border border-dashed md:py-32">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarIcon />
          </EmptyMedia>
          <EmptyTitle>No unconfirmed bookings</EmptyTitle>
          <EmptyDescription>
            You have no unconfirmed bookings found. Bookings awaiting your
            confirmation will appear here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </TooltipProvider>
  );
}
