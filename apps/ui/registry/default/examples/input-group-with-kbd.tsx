import { Input } from "@/registry/default/ui/input"
import { InputGroup, InputGroupAddon } from "@/registry/default/ui/input-group"
import { Kbd } from "@/registry/default/ui/kbd"

export default function InputGroupWithKbd() {
  return (
    <InputGroup>
      <Input type="search" placeholder="Search…" />
      <InputGroupAddon align="inline-end">
        <Kbd>⌘K</Kbd>
      </InputGroupAddon>
    </InputGroup>
  )
}
