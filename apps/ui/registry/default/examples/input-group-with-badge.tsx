import { Badge } from "@/registry/default/ui/badge";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/registry/default/ui/input-group";

export default function InputGroupWithBadge() {
  return (
    <InputGroup>
      <InputGroupInput type="search" placeholder="Type to search…" />
      <InputGroupAddon align="inline-end">
        <Badge variant="info">Badge</Badge>
      </InputGroupAddon>
    </InputGroup>
  );
}
