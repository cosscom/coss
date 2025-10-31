import { Input } from "@/registry/default/ui/input"
import { InputGroup, InputGroupAddon } from "@/registry/default/ui/input-group"
import { Spinner } from "@/registry/default/ui/spinner"

export default function InputGroupLoading() {
  return (
    <InputGroup>
      <Input type="search" placeholder="Searching…" disabled />
      <InputGroupAddon align="inline-end">
        <Spinner />
      </InputGroupAddon>
    </InputGroup>
  )
}
