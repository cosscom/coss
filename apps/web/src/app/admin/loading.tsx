import { PageSkeleton } from "@/components/page-skeleton";

/**
 * Shown under the admin layout while a page renders, so a click responds at once: several pages
 * wait on slow reads (the deploys pages on GitHub, a run's page on a dozen requests).
 */
export default function AdminLoading() {
  return <PageSkeleton />;
}
