import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/registry/default/ui/input-group"
import { Kbd } from "@/registry/default/ui/kbd"

export default function InputGroupWithKbd() {
  return (
    <InputGroup>
      <InputGroupInput type="search" placeholder="Search…" />
      <InputGroupAddon align="inline-end">
        <Kbd>⌘K</Kbd>
      </InputGroupAddon>
    </InputGroup>
  )
}
