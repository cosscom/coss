import { useId } from "react";

import { Input } from "@/registry/default/ui/input";
import { Label } from "@/registry/default/ui/label";

export default function Particle() {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <div className="inline-flex w-full items-center justify-between gap-2">
        <Label className="leading-6" htmlFor={id}>
          Email
        </Label>
        <span className="text-muted-foreground text-sm">Optional</span>
      </div>
      <Input id={id} placeholder="Email" type="email" />
    </div>
  );
}
