"use client";

import { Button } from "@/registry/default/ui/button";
import { toastManager } from "@/registry/default/ui/toast";

const ERROR_TOAST_ID = "coss-demo-error-upsert";

export default function Particle() {
  return (
    <Button
      onClick={() => {
        toastManager.add({
          description:
            "Repeated taps update the same toast; error type uses the shake motion.",
          id: ERROR_TOAST_ID,
          title: "Something went wrong",
          type: "error",
        });
      }}
      variant="outline"
    >
      Error toast (upsert)
    </Button>
  );
}
