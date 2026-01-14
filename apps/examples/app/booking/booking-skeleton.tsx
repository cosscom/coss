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
            <Skeleton className="h-5 w-full max-w-82" />
            <Skeleton className="my-0.5 h-4 w-full max-w-82" />
          </ListItemHeader>
          <ListItemBadges>
            <Skeleton className="h-4.5 w-14" />
            <Skeleton className="h-4.5 w-14" />
          </ListItemBadges>
        </ListItemContent>

        <div className="md:-order-1 flex flex-col items-start gap-2 md:w-36 md:shrink-0">
          <div className="flex w-full flex-col gap-1">
            <Skeleton className="h-5 w-full max-w-28" />
            <Skeleton className="my-0.5 h-4 w-full max-w-28" />
          </div>
          <Skeleton className="h-6 w-28 rounded-lg" />
        </div>
      </div>

      <ListItemActions>
        <BookingActionsSkeleton />
      </ListItemActions>
    </ListItem>
  );
}
