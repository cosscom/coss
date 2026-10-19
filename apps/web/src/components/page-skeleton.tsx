import { Skeleton } from "@coss/ui/components/skeleton";

/** A page's outline while it renders (a route's `loading.tsx`): header, a stat row, a panel. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6" role="status">
      <span className="sr-only">Loading…</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border lg:grid-cols-4">
        {["a", "b", "c", "d"].map((key) => (
          <div className="flex flex-col gap-2 bg-card px-5 py-4" key={key}>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-7 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  );
}
