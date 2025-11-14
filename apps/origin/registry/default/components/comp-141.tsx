import { useId } from "react";

import { Checkbox } from "@/registry/default/ui/checkbox";
import { Label } from "@/registry/default/ui/label";

export default function Component() {
  const id = useId();
  return (
    <div className="flex items-start gap-2">
      <Checkbox id={id} aria-describedby={`${id}-description`} />
      <div className="grid grow gap-2">
        <Label htmlFor={id}>
          Label{" "}
          <span className="font-normal text-muted-foreground text-xs leading-[inherit]">
            (Sublabel)
          </span>
        </Label>
        <p id={`${id}-description`} className="text-muted-foreground text-xs">
          You can use this checkbox with a label and a description.
        </p>
      </div>
    </div>
  );
}
