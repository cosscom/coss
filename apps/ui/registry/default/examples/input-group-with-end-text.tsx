import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/registry/default/ui/input-group"

export default function InputGroupWithEndText() {
  return (
    <InputGroup>
      <InputGroupInput
        type="text"
        placeholder="Choose a username"
        aria-label="Choose a username"
      />
      <InputGroupAddon align="inline-end">@coss.com</InputGroupAddon>
    </InputGroup>
  )
}
