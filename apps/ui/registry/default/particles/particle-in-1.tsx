import { InfoIcon } from "lucide-react"

import { Button } from "@/registry/default/ui/button"
import { Input } from "@/registry/default/ui/input"
import { InputGroup, InputGroupAddon } from "@/registry/default/ui/input-group"
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@/registry/default/ui/popover"

export default function Particle() {
  return (
    <InputGroup>
      <Input
        type="text"
        className="*:[input]:ps-1!"
        placeholder="coss.com"
        aria-label="Set your URL"
      />
      <InputGroupAddon>https://</InputGroupAddon>
      <InputGroupAddon align="inline-end">
        <Popover openOnHover>
          <PopoverTrigger render={<Button variant="ghost" size="icon-xs" />}>
            <InfoIcon />
          </PopoverTrigger>
          <PopoverPopup tooltipStyle side="top">
            <p>The URL of your website</p>
          </PopoverPopup>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  )
}
