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
import {
  ListItem,
  ListItemActions,
  ListItemBadges,
  ListItemContent,
  ListItemHeader,
} from "@/components/list-item";

function BookingSkeletonItem() {
  return (
    <ListItem>
      <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:gap-4">
        <ListItemContent>
          <ListItemHeader>
            <Skeleton className="h-5 w-full max-w-48" />
            <Skeleton className="my-0.5 h-4 w-full max-w-32" />
          </ListItemHeader>
          <ListItemBadges>
            <Skeleton className="h-4.5 w-14" />
            <Skeleton className="h-4.5 w-14" />
          </ListItemBadges>
        </ListItemContent>

        <div className="md:-order-1 flex flex-col items-start gap-2 md:w-36 md:shrink-0">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-7 w-20 rounded-lg" />
        </div>
      </div>

      <ListItemActions>
        <Skeleton className="size-9 rounded-lg" />
      </ListItemActions>
    </ListItem>
  );
}

const ARTIFICIAL_DELAY_MS = 1500;

export default function Page() {
  const { isLoadingOverride } = useDebug();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, ARTIFICIAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const showLoading = isLoadingOverride ?? isLoading;

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
