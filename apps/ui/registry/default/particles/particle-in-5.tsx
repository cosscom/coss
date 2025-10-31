import { Input } from "@/registry/default/ui/input"
import { InputGroup, InputGroupAddon } from "@/registry/default/ui/input-group"
import { Spinner } from "@/registry/default/ui/spinner"

export default function Particle() {
  return (
    <InputGroup>
      <Input type="search" placeholder="Processing…" disabled />
      <InputGroupAddon>
        <Spinner />
      </InputGroupAddon>
    </InputGroup>
  )
}
