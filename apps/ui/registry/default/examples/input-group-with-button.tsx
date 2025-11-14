import { Button } from "@/registry/default/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/registry/default/ui/input-group";

export default function InputGroupWithButton() {
  return (
    <InputGroup>
      <InputGroupInput type="search" placeholder="Type to search…" />
      <InputGroupAddon align="inline-end">
        <Button variant="secondary" size="xs">
          Search
        </Button>
      </InputGroupAddon>
    </InputGroup>
  );
}
