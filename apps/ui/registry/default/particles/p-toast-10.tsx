"use client";

import { Button } from "@/registry/default/ui/button";
import { toastManager } from "@/registry/default/ui/toast";

const DEDUP_ID = "coss-demo-dedup-toast";

export default function Particle() {
  return (
    <Button
      onClick={() => {
        toastManager.add({
          description:
            "Only one toast stays visible; repeated clicks update it.",
          id: DEDUP_ID,
          title: "Saved",
          type: "success",
        });
      }}
      variant="outline"
    >
      Upsert same toast
    </Button>
  );
}
