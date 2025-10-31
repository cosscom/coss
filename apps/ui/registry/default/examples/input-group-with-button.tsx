import { Button } from "@/registry/default/ui/button"
import { Input } from "@/registry/default/ui/input"
import { InputGroup, InputGroupAddon } from "@/registry/default/ui/input-group"

export default function InputGroupWithButton() {
  return (
    <InputGroup>
      <Input type="search" placeholder="Type to search…" />
      <InputGroupAddon align="inline-end">
        <Button variant="secondary" size="xs">
          Search
        </Button>
      </InputGroupAddon>
    </InputGroup>
  )
}
