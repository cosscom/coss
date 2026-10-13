"use client";

import { Button } from "@coss/ui/components/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ImpersonationBanner({ email }: { email: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-warning/32 border-b bg-warning/8 px-6 py-2 text-sm">
      <span>
        You are impersonating <strong>{email}</strong>.
      </span>
      <Button
        loading={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          // Loaded on click: the client (every plugin) would weigh on every page.
          const { authClient } = await import("@/lib/auth-client");
          const { error } = await authClient.admin.stopImpersonating();
          if (error) {
            setError(error.message ?? "Could not stop impersonating.");
            setPending(false);
            return;
          }
          router.push("/admin");
          router.refresh();
        }}
        size="xs"
        variant="outline"
      >
        Stop impersonating
      </Button>
      {error ? <span className="text-destructive-foreground">{error}</span> : null}
    </div>
  );
}
