import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/registry/default/ui/input-group"

export default function InputGroupWithStartText() {
  return (
    <InputGroup>
      <InputGroupInput
        type="search"
        className="*:[input]:ps-1!"
        placeholder="coss"
        aria-label="Set your URL"
      />
      <InputGroupAddon>i.cal.com/</InputGroupAddon>
    </InputGroup>
  )
}
