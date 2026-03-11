import Link from "next/link";
import { Button } from "@/registry/default/ui/button";
import PageHeader from "@/components/page-header";

export default function NotFound() {
  return (
    <>
      <PageHeader className="mb-6" title="404">
        The page you&apos;re looking for does not exist or is no longer here.
      </PageHeader>
      <div className="text-center">
        <Button asChild className="rounded-full">
          <Link href="/origin">Browse components</Link>
        </Button>
      </div>
    </>
  );
}
