import { MailIcon } from "lucide-react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/registry/default/ui/input-group"

export default function InputGroupWithEndIcon() {
  return (
    <InputGroup>
      <InputGroupInput type="email" placeholder="Email" aria-label="Email" />
      <InputGroupAddon align="inline-end">
        <MailIcon />
      </InputGroupAddon>
    </InputGroup>
  )
}
