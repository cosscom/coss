import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/registry/default/ui/button";

export default function Particle() {
  return (
    <Button className="group">
      Get Started
      <ArrowRightIcon
        aria-hidden="true"
        className="transition-transform group-hover:translate-x-0.5"
      />
    </Button>
  );
}
