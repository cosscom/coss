import { Input } from "@/registry/default/ui/input"
import { InputGroup, InputGroupAddon } from "@/registry/default/ui/input-group"

export default function InputGroupWithStartEndText() {
  return (
    <InputGroup>
      <Input
        type="text"
        className="*:[input]:ps-1!"
        placeholder="coss"
        aria-label="Enter your domain"
      />
      <InputGroupAddon>https://</InputGroupAddon>
      <InputGroupAddon align="inline-end">.com</InputGroupAddon>
    </InputGroup>
  )
}
