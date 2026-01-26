import {
  Card,
  CardFrame,
  CardFrameHeader,
  CardPanel,
} from "@coss/ui/components/card";
import { FrameFooter } from "@coss/ui/components/frame";
import { Separator } from "@coss/ui/components/separator";
import { Skeleton } from "@coss/ui/components/skeleton";
import {
  ListItem,
  ListItemActions,
  ListItemBadges,
  ListItemContent,
  ListItemHeader,
} from "@/components/list-item";
import { BookingActionsSkeleton } from "./past/booking-actions";

export function BookingSkeletonItem() {
  return (
    <ListItem>
      <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:gap-4">
        <ListItemContent>
          <ListItemHeader>
            <Skeleton className="h-6 w-full max-w-82 sm:h-5" />
            <Skeleton className="my-0.5 h-4 w-full max-w-82" />
          </ListItemHeader>
          <ListItemBadges>
            <Skeleton className="h-5.5 w-14 sm:h-4.5" />
            <Skeleton className="h-5.5 w-14 sm:h-4.5" />
          </ListItemBadges>
        </ListItemContent>

        <div className="md:-order-1 flex flex-col items-start gap-2 md:w-36 md:shrink-0">
          <div className="flex w-full flex-col gap-1">
            <Skeleton className="h-5 w-full max-w-28" />
            <Skeleton className="my-0.5 h-4 w-full max-w-28" />
          </div>
          <Skeleton className="h-7 w-28 rounded-lg sm:h-6" />
        </div>
      </div>

      <ListItemActions>
        <BookingActionsSkeleton />
      </ListItemActions>
    </ListItem>
  );
}

export function BookingsListSkeleton() {
  return (
    <CardFrame>
      <CardFrameHeader>
        <Skeleton className="h-6 sm:h-5 w-40" />
      </CardFrameHeader>
      <Card>
        <CardPanel className="p-0">
          <BookingSkeletonItem />
          <BookingSkeletonItem />
          <BookingSkeletonItem />
          <BookingSkeletonItem />
          <BookingSkeletonItem />
        </CardPanel>
      </Card>
      <FrameFooter>
        <Skeleton className="mx-auto h-5 w-32" />
      </FrameFooter>
    </CardFrame>
  );
}

export function BookingsListSkeletonWithPagination() {
  return (
    <CardFrame>
      <CardFrameHeader>
        <Skeleton className="h-6 sm:h-5 w-40" />
      </CardFrameHeader>
      <Card>
        <CardPanel className="p-0">
          <BookingSkeletonItem />
          <BookingSkeletonItem />
          <BookingSkeletonItem />
          <BookingSkeletonItem />
          <BookingSkeletonItem />
        </CardPanel>
      </Card>
      <FrameFooter>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-12 rounded-lg" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-12" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-18 rounded-lg" />
              <Skeleton className="h-7 w-18 rounded-lg" />
            </div>
          </div>
        </div>
      </FrameFooter>
    </CardFrame>
  );
}
