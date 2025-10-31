import { Input } from "@/registry/default/ui/input"
import { InputGroup, InputGroupAddon } from "@/registry/default/ui/input-group"

export default function InputGroupWithStartText() {
  return (
    <InputGroup>
      <Input
        type="search"
        className="*:[input]:ps-1!"
        placeholder="coss"
        aria-label="Set your URL"
      />
      <InputGroupAddon>i.cal.com/</InputGroupAddon>
    </InputGroup>
  )
}
