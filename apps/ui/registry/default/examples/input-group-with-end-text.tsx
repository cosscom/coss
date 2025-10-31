import { Input } from "@/registry/default/ui/input"
import { InputGroup, InputGroupAddon } from "@/registry/default/ui/input-group"

export default function InputGroupWithEndText() {
  return (
    <InputGroup>
      <Input
        type="text"
        placeholder="Choose a username"
        aria-label="Choose a username"
      />
      <InputGroupAddon align="inline-end">@coss.com</InputGroupAddon>
    </InputGroup>
  )
}
