"use client";
import { DASHBOARD_PATH } from "@coss/auth/slugs";
import { Button } from "@coss/ui/components/button";
import { dashboardUrl } from "@/lib/site";
import { useAccount } from "@/lib/use-account";

/**
 * "Dashboard" when signed in to the dashboard (its entry page opens the user's organization),
 * otherwise "Sign in" and "Sign up".
 */
export function AccountLinks() {
  const account = useAccount();
  // Reserve the space while loading so the header doesn't jump.
  if (account.status === "loading") return <div aria-hidden className="h-8 w-36" />;

  if (account.status === "signed-in") {
    return (
      <Button render={<a href={dashboardUrl(DASHBOARD_PATH)} />} size="sm">
        Dashboard
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Button render={<a href={dashboardUrl("/sign-in")} />} size="sm" variant="ghost">
        Sign in
      </Button>
      <Button render={<a href={dashboardUrl("/sign-up")} />} size="sm">
        Sign up
      </Button>
    </div>
  );
}
