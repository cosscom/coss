import { SearchIcon } from "lucide-react"

import { Input } from "@/registry/default/ui/input"
import { InputGroup, InputGroupAddon } from "@/registry/default/ui/input-group"

export default function InputGroupDemo() {
  return (
    <InputGroup>
      <Input type="search" placeholder="Search" aria-label="Search" />
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
    </InputGroup>
  )
}
