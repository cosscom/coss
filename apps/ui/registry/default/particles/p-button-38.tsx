import { RiGoogleFill } from "@remixicon/react";

import { Button } from "@/registry/default/ui/button";

export default function Particle() {
  return (
    <Button variant="outline">
      <RiGoogleFill aria-hidden="true" />
      Login with Google
    </Button>
  );
}
