import { ChevronLeftIcon } from "lucide-react";
import { Button } from "@/registry/default/ui/button";

export default function Component() {
  return (
    <Button className="relative ps-12">
      Previous
      <span className="pointer-events-none absolute inset-s-0 inset-y-0 flex w-9 items-center justify-center bg-primary-foreground/15">
        <ChevronLeftIcon aria-hidden="true" className="opacity-60" size={16} />
      </span>
    </Button>
  );
}
