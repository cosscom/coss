import { Button } from "@/registry/default/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/registry/default/ui/input-group";

export default function Particle() {
  return (
    <InputGroup>
      <InputGroupAddon align="block-start">
        <Button>Send</Button>
      </InputGroupAddon>
      <InputGroupTextarea placeholder="Type your message here" />
    </InputGroup>
  );
}
