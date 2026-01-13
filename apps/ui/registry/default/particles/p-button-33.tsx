import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/registry/default/ui/button";

export default function Particle() {
  return (
    <Button variant="outline">
      Options
      <ChevronDownIcon aria-hidden="true" />
    </Button>
  );
}
