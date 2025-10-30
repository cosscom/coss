import { Input } from "@/registry/default/ui/input"
import { InputGroup, InputGroupAddon } from "@/registry/default/ui/input-group"

export default function Particle() {
  return (
    <InputGroup>
      <Input
        className="*:[input]:ps-1!"
        placeholder="coss.com"
        aria-label="Enter your domain"
      />
      <InputGroupAddon>https://</InputGroupAddon>
    </InputGroup>
  )
}
