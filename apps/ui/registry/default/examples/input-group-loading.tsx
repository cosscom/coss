import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/registry/default/ui/input-group";
import { Spinner } from "@/registry/default/ui/spinner";

export default function InputGroupLoading() {
  return (
    <InputGroup>
      <InputGroupInput disabled placeholder="Searching…" type="search" />
      <InputGroupAddon align="inline-end">
        <Spinner />
      </InputGroupAddon>
    </InputGroup>
  );
}
