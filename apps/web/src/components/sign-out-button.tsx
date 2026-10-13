"use client";

import { Button } from "@coss/ui/components/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton({ redirectTo = "/sign-in" }: { redirectTo?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      loading={pending}
      onClick={async () => {
        setPending(true);
        // Loaded on click: the client (every plugin) would weigh on every page.
        const { authClient } = await import("@/lib/auth-client");
        await authClient.signOut();
        router.push(redirectTo);
        router.refresh();
      }}
      size="sm"
      variant="ghost"
    >
      Sign out
    </Button>
  );
}
