import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/registry/default/ui/button";
import { Field, FieldError, FieldLabel } from "@/registry/default/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/registry/default/ui/input-group";

export default function FieldInputGroup() {
  return (
    <Field>
      <FieldLabel>Subscribe</FieldLabel>
      <InputGroup>
        <InputGroupInput type="email" placeholder="Your best email" />
        <InputGroupAddon align="inline-end">
          <Button variant="ghost" aria-label="Subscribe" size="icon-xs">
            <ArrowRightIcon />
          </Button>
        </InputGroupAddon>
      </InputGroup>
      <FieldError>Please enter a valid email address.</FieldError>
    </Field>
  );
}
