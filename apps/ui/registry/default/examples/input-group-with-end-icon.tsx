import { MailIcon } from "lucide-react"

import { Input } from "@/registry/default/ui/input"
import { InputGroup, InputGroupAddon } from "@/registry/default/ui/input-group"

export default function InputGroupWithEndIcon() {
  return (
    <InputGroup>
      <Input type="email" placeholder="Email" aria-label="Email" />
      <InputGroupAddon align="inline-end">
        <MailIcon />
      </InputGroupAddon>
    </InputGroup>
  )
}
