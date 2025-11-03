import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
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
      <InputGroupAddon>
        <InputGroupText>i.cal.com/</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  )
}
