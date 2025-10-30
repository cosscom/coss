"use client"

import { useState } from "react"
import { useCopyToClipboard } from "@/registry/default/hooks/use-copy-to-clipboard"
import { SearchIcon, MailIcon, InfoIcon, StarIcon, CheckIcon, CopyIcon } from "lucide-react"

import { Button } from "@/registry/default/ui/button"
import { Input } from "@/registry/default/ui/input"
import { InputGroup, InputGroupAddon } from "@/registry/default/ui/input-group"
import {
  NumberField,
  NumberFieldInput,
} from "@/registry/default/ui/number-field"
import {
  Popover,
  PopoverPopup,
  PopoverTitle,
  PopoverDescription,
  PopoverTrigger,
} from "@/registry/default/ui/popover"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/registry/default/ui/tooltip"

export default function Particle() {
  const { copyToClipboard, isCopied } = useCopyToClipboard()
  const [isFavorite, setIsFavorite] = useState(false)

  return (
    <div className="flex flex-col gap-2">

      <InputGroup>
        <Input
          placeholder="Search"
          aria-label="Search"
        />
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
      </InputGroup>

      <InputGroup>
        <Input
          type="email"
          placeholder="Email"
          aria-label="Email"
        />
        <InputGroupAddon align="inline-end">
          <MailIcon />
        </InputGroupAddon>
      </InputGroup> 

      <Input placeholder="Search" aria-label="Search" />

      <InputGroup>
        <Input
          className="*:[input]:ps-1!"
          placeholder="coss"
          aria-label="Set your URL"
        />
        <InputGroupAddon>i.cal.com/</InputGroupAddon>
      </InputGroup>
      
      <InputGroup>
        <Input
          className="*:[input]:ps-1!"
          placeholder="coss.com"
          aria-label="Set your URL"
        />
        <InputGroupAddon>https://</InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <Tooltip>
            <TooltipTrigger render={<InfoIcon />} />
            <TooltipContent>
              <p>The URL of your website</p>
            </TooltipContent>
          </Tooltip>
        </InputGroupAddon>
      </InputGroup>

      <InputGroup>
        <Input
          placeholder="Password"
          aria-label="Password"
        />
        <InputGroupAddon align="inline-end">
          <Tooltip>
            <TooltipTrigger render={<InfoIcon />} />
            <TooltipContent>
              <p>Password must be at least 8 characters long</p>
            </TooltipContent>
          </Tooltip>
        </InputGroupAddon>
      </InputGroup>      
      
      <InputGroup>
        <Input
          className="*:[input]:ps-1!"
          placeholder="coss.com"
          aria-label="Set your URL"
        />
        <InputGroupAddon>https://</InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <StarIcon />
          <InfoIcon />
        </InputGroupAddon>        
      </InputGroup>        

      <InputGroup>
        <Input
          placeholder="coss"
          aria-label="Enter your domain"
        />
        <InputGroupAddon>https://</InputGroupAddon>
        <InputGroupAddon align="inline-end">.com</InputGroupAddon>
      </InputGroup>

      <InputGroup>
        <Input
          placeholder="Choose a username"
          aria-label="Choose a username"
        />
        <InputGroupAddon align="inline-end">@coss.com</InputGroupAddon>
      </InputGroup>      
      
      <InputGroup>
        <NumberField defaultValue={10} aria-label="Enter the amount">
          <NumberFieldInput className="text-left" />
        </NumberField>
        <InputGroupAddon>€</InputGroupAddon>
        <InputGroupAddon align="inline-end">EUR</InputGroupAddon>
      </InputGroup>

      <InputGroup>
        <Input placeholder="https://x.com/shadcn" readOnly />
        <InputGroupAddon align="inline-end">
          <Tooltip>
            <TooltipTrigger render={
              <Button
                variant="ghost"
                aria-label="Copy"
                title="Copy"
                size="icon-xs"
                onClick={() => {
                  copyToClipboard("https://x.com/shadcn")
                }}
              />              
            }>
              {isCopied ? <CheckIcon /> : <CopyIcon />}
            </TooltipTrigger>
            <TooltipContent>
              <p>Copy to clipboard</p>
            </TooltipContent>
          </Tooltip>
        </InputGroupAddon>
      </InputGroup>

      <InputGroup className="[--radius:9999px] [--radius-md:9999px] [--radius-lg:9999px]">
        <Popover>
          <InputGroupAddon>
            <PopoverTrigger render={<Button variant="secondary" size="icon-xs" />}>
              <InfoIcon />
            </PopoverTrigger>
          </InputGroupAddon>
          <PopoverPopup align="start" sideOffset={6} alignOffset={-5} className="w-64">
            <PopoverTitle className="text-sm">Your connection is not secure.</PopoverTitle>
            <PopoverDescription>You should not enter any sensitive information on this site.</PopoverDescription>
          </PopoverPopup>
        </Popover>
        <InputGroupAddon className="text-muted-foreground pl-1.5">
          https://
        </InputGroupAddon>
        <Input type="text" />
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

      <InputGroup>
        <Input placeholder="Type to search..." />
        <InputGroupAddon align="inline-end">
          <Button variant="secondary" size="xs">Search</Button>
        </InputGroupAddon>
      </InputGroup>      
    </div>
  )
}
