import { DASHBOARD_PATH } from "@coss/auth/slugs";
import { Button } from "@coss/ui/components/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-semibold text-2xl">Not found</h1>
      <p className="text-muted-foreground text-sm">
        This page doesn't exist, or you don't have access to it.
      </p>
      <Button render={<Link href={DASHBOARD_PATH} />} variant="outline">
        Go to dashboard
      </Button>
    </main>
  );
}
