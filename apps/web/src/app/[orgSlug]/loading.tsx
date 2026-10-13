import { Skeleton } from "@coss/ui/components/skeleton";

/**
 * Shown under the organization layout while a page renders. Its presence also lets `<Link>`
 * prefetch the layout and this skeleton for these dynamic routes, so a click responds at once
 * instead of waiting for the server.
 */
export default function OrganizationLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6" role="status">
      <span className="sr-only">Loading…</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
