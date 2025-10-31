import { Badge } from "@/registry/default/ui/badge"
import { Input } from "@/registry/default/ui/input"
import { InputGroup, InputGroupAddon } from "@/registry/default/ui/input-group"

export default function InputGroupWithBadge() {
  return (
    <InputGroup>
      <Input type="search" placeholder="Type to search…" />
      <InputGroupAddon align="inline-end">
        <Badge variant="info">Badge</Badge>
      </InputGroupAddon>
    </InputGroup>
  )
}
