"use client"

import { InfoIcon } from "lucide-react"

import { Button } from "@/registry/default/ui/button"
import { Input } from "@/registry/default/ui/input"
import { InputGroup, InputGroupAddon } from "@/registry/default/ui/input-group"
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@/registry/default/ui/popover"

export default function InputGroupWithEndTooltip() {
  return (
    <InputGroup>
      <Input type="password" placeholder="Password" aria-label="Password" />
      <InputGroupAddon align="inline-end">
        <Popover openOnHover>
          <PopoverTrigger render={<Button variant="ghost" size="icon-xs" />}>
            <InfoIcon />
          </PopoverTrigger>
          <PopoverPopup tooltipStyle side="top">
            <p>Min. 8 characters</p>
          </PopoverPopup>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  )
}
