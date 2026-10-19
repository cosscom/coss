import { PageSkeleton } from "@/components/page-skeleton";

/**
 * Shown under the organization layout while a page renders. Its presence also lets `<Link>`
 * prefetch the layout and this skeleton for these dynamic routes, so a click responds at once
 * instead of waiting for the server.
 */
export default function OrganizationLoading() {
  return <PageSkeleton />;
}
