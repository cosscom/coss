import { MailIcon } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/registry/default/ui/input-group";

export default function InputGroupWithEndIcon() {
  return (
    <InputGroup>
      <InputGroupInput aria-label="Email" placeholder="Email" type="email" />
      <InputGroupAddon align="inline-end">
        <MailIcon />
      </InputGroupAddon>
    </InputGroup>
  );
}
