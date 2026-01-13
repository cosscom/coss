import { PrinterIcon } from "lucide-react";

import { Button } from "@/registry/default/ui/button";
import { Kbd } from "@/registry/default/ui/kbd";

export default function Particle() {
  return (
    <Button variant="outline">
      <PrinterIcon aria-hidden="true" className="opacity-60" />
      Print
      <Kbd className="-me-1 ms-1">
        <span className="text-xs">&#8984;</span>P
      </Kbd>
    </Button>
  );
}
