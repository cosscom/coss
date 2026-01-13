import { RiGithubFill, RiGoogleFill, RiTwitterXFill } from "@remixicon/react";

import { Button } from "@/registry/default/ui/button";

export default function Particle() {
  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline">
        <RiGoogleFill aria-hidden="true" />
        Login with Google
      </Button>
      <Button variant="outline">
        <RiTwitterXFill aria-hidden="true" />
        Login with X
      </Button>
      <Button variant="outline">
        <RiGithubFill aria-hidden="true" />
        Login with GitHub
      </Button>
    </div>
  );
}
