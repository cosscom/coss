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
import { useEffect, useState } from "react";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app-header";
import { useDebug } from "@/components/debug-context";
import { BookingSkeletonItem } from "../booking-skeleton";

const ARTIFICIAL_DELAY_MS = 400;

export default function Page() {
  const { enableArtificialDelay, isLoadingOverride } = useDebug();
  const [isLoading, setIsLoading] = useState(enableArtificialDelay);

  useEffect(() => {
    if (!enableArtificialDelay) {
      setIsLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, ARTIFICIAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [enableArtificialDelay]);

  const showLoading = isLoadingOverride ?? isLoading;

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
