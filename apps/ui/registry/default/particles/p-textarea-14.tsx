import { Button } from "@/registry/default/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/registry/default/ui/input-group";

export default function Particle() {
  return (
    <InputGroup>
      <InputGroupTextarea placeholder="Type your message here" />
      <InputGroupAddon align="block-end">
        <Button>Send</Button>
      </InputGroupAddon>
    </InputGroup>
  );
}
