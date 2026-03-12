import { useId } from "react";
import { Input } from "@/registry/default/ui/input";

export default function Component() {
  const id = useId();
  return (
    <div className="group relative">
      <label
        className="absolute start-1 top-0 z-10 block -translate-y-1/2 bg-background px-2 font-medium text-foreground text-xs group-has-disabled:opacity-50"
        htmlFor={id}
      >
        Input with overlapping label
      </label>
      <Input className="h-10" id={id} placeholder="Email" type="email" />
    </div>
  );
}
