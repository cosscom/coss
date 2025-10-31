import { Input } from "@/registry/default/ui/input"
import { InputGroup, InputGroupAddon } from "@/registry/default/ui/input-group"
import { Kbd } from "@/registry/default/ui/kbd"

export default function Particle() {
  return (
    <InputGroup>
      <Input type="search" placeholder="Search…" />
      <InputGroupAddon align="inline-end">
        <Kbd>/</Kbd>
      </InputGroupAddon>
    </InputGroup>
  )
}
