import { SearchIcon } from "lucide-react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/registry/default/ui/input-group"

export default function InputGroupDemo() {
  return (
    <InputGroup>
      <InputGroupInput type="search" placeholder="Search" aria-label="Search" />
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
    </InputGroup>
  )
}
