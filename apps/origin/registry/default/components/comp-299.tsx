"use client";

import { toast } from "sonner";

import { Button } from "@/registry/default/ui/button";

export default function Component() {
  return (
    <Button
      onClick={() => {
        toast("Your request was completed!", {
          description: "It was a long journey, but we made it!",
          action: {
            label: "Undo",
            onClick: () => console.log("Undo"),
          },
        });
      }}
      variant="outline"
    >
      Show sonner
    </Button>
  );
}
