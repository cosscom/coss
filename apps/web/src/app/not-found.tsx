import { DASHBOARD_PATH } from "@coss/auth/slugs";
import { Button } from "@coss/ui/components/button";
import { CompassIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh p-2">
      <div className="flex flex-1 overflow-hidden rounded-2xl border bg-background">
        <EmptyState
          action={
            <Button render={<Link href={DASHBOARD_PATH} />} variant="outline">
              Go to dashboard
            </Button>
          }
          description="This page doesn't exist, or you don't have access to it."
          icon={CompassIcon}
          title="Not found"
        />
      </div>
    </main>
  );
}
