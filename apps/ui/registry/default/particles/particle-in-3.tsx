"use client"

import { useState } from "react"
import { InfoIcon, StarIcon } from "lucide-react"

import { Button } from "@/registry/default/ui/button"
import { Input } from "@/registry/default/ui/input"
import { InputGroup, InputGroupAddon } from "@/registry/default/ui/input-group"
import {
  Popover,
  PopoverDescription,
  PopoverPopup,
  PopoverTitle,
  PopoverTrigger,
} from "@/registry/default/ui/popover"

export default function Particle() {
  const [isFavorite, setIsFavorite] = useState(false)

  return (
    <InputGroup className="[--radius-lg:9999px] [--radius-md:9999px] [--radius:9999px]">
      <Popover>
        <InputGroupAddon>
          <PopoverTrigger
            render={<Button variant="secondary" size="icon-xs" />}
          >
            <InfoIcon />
          </PopoverTrigger>
        </InputGroupAddon>
        <PopoverPopup
          align="start"
          sideOffset={6}
          alignOffset={-5}
          className="w-64"
        >
          <PopoverTitle className="text-sm">
            Your connection is not secure.
          </PopoverTitle>
          <PopoverDescription>
            You should not enter any sensitive information on this site.
          </PopoverDescription>
        </PopoverPopup>
      </Popover>
      <InputGroupAddon className="pl-1.5 text-muted-foreground">
        https://
      </InputGroupAddon>
      <Input type="text" className="*:[input]:ps-1!" aria-label="Url" />
      <InputGroupAddon align="inline-end">
        <Button
          variant="ghost"
          onClick={() => setIsFavorite(!isFavorite)}
          size="icon-xs"
        >
          <StarIcon
            data-favorite={isFavorite}
            className="data-[favorite=true]:fill-primary data-[favorite=true]:stroke-primary"
          />
        </Button>
      </InputGroupAddon>
    </InputGroup>
  )
}
