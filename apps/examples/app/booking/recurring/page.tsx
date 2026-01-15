"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@coss/ui/components/empty";
import { Frame, FrameFooter, FramePanel } from "@coss/ui/components/frame";
import { Separator } from "@coss/ui/components/separator";
import { Skeleton } from "@coss/ui/components/skeleton";
import { TooltipProvider } from "@coss/ui/components/tooltip";
import { CalendarIcon } from "lucide-react";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app-header";
import { useLoadingState } from "@/hooks/use-loading-state";
import { BookingSkeletonItem } from "../booking-skeleton";

const ARTIFICIAL_DELAY_MS = 300;

export default function Page() {
  const showLoading = useLoadingState(ARTIFICIAL_DELAY_MS);

  if (showLoading) {
    return (
      <>
        <AppHeader>
          <AppHeaderContent title="Recurring Bookings">
            <AppHeaderDescription>
              View your recurring bookings and series.
            </AppHeaderDescription>
          </AppHeaderContent>
        </AppHeader>

        <Frame className="-m-1">
          <FramePanel className="p-0">
            <BookingSkeletonItem />
            <Separator />
            <BookingSkeletonItem />
            <Separator />
            <BookingSkeletonItem />
            <Separator />
            <BookingSkeletonItem />
            <Separator />
            <BookingSkeletonItem />
          </FramePanel>
          <FrameFooter>
            <Skeleton className="mx-auto h-5 w-32" />
          </FrameFooter>
        </Frame>
      </>
    );
  }

  return (
    <TooltipProvider delay={150} timeout={0}>
      <AppHeader>
        <AppHeaderContent title="Recurring Bookings">
          <AppHeaderDescription>
            View your recurring bookings and series.
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>

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
    </TooltipProvider>
  );
}
