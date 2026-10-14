"use client";

import { Button } from "@coss/ui/components/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postAuth } from "@/lib/auth-post";

export function SignOutButton({ redirectTo = "/sign-in" }: { redirectTo?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      loading={pending}
      onClick={async () => {
        setPending(true);
        await postAuth("/sign-out");
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
