"use client";

import { DASHBOARD_PATH } from "@coss/auth/slugs";
import { Button } from "@coss/ui/components/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type Result = { error: { message?: string } | null };

/**
 * Per-user admin actions. The admin plugin endpoints check the caller's platform role on the
 * server; this component only drives them.
 */
export function UserActions(props: { userId: string; isAdmin: boolean; banned: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(name: string, action: () => Promise<Result>, after?: () => void) {
    setPending(name);
    setError(null);
    const { error } = await action();
    setPending(null);
    if (error) {
      setError(error.message ?? "Action failed.");
      return;
    }
    if (after) after();
    else router.refresh();
  }

  const { userId } = props;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-1">
        <Button
          disabled={pending !== null}
          loading={pending === "role"}
          onClick={() =>
            run("role", () =>
              authClient.admin.setRole({ userId, role: props.isAdmin ? "user" : "admin" }),
            )
          }
          size="xs"
          variant="outline"
        >
          {props.isAdmin ? "Remove admin" : "Make admin"}
        </Button>
        <Button
          disabled={pending !== null}
          loading={pending === "ban"}
          onClick={() =>
            run("ban", () =>
              props.banned
                ? authClient.admin.unbanUser({ userId })
                : authClient.admin.banUser({ userId }),
            )
          }
          size="xs"
          variant={props.banned ? "outline" : "destructive-outline"}
        >
          {props.banned ? "Unban" : "Ban"}
        </Button>
        <Button
          disabled={pending !== null || props.banned}
          loading={pending === "impersonate"}
          onClick={() =>
            run(
              "impersonate",
              () => authClient.admin.impersonateUser({ userId }),
              () => {
                router.push(DASHBOARD_PATH);
                router.refresh();
              },
            )
          }
          size="xs"
          variant="outline"
        >
          Impersonate
        </Button>
      </div>
      {error ? <span className="text-destructive-foreground text-xs">{error}</span> : null}
    </div>
  );
}
