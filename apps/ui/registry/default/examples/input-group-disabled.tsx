import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/registry/default/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/registry/default/ui/input-group";

export default function InputGroupDisabled() {
  return (
    <InputGroup>
      <InputGroupInput
        type="email"
        placeholder="Your best email"
        aria-label="Subscribe to our newsletter"
        disabled
      />
      <InputGroupAddon align="inline-end">
        <Button variant="ghost" aria-label="Subscribe" size="icon-xs" disabled>
          <ArrowRightIcon />
        </Button>
      </InputGroupAddon>
    </InputGroup>
  );
}
