"use client"

import { useState } from "react"
import {
  ArrowUpIcon,
  CheckIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  InfoIcon,
  MailIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
} from "lucide-react"

import { useCopyToClipboard } from "@/registry/default/hooks/use-copy-to-clipboard"
import { Badge } from "@/registry/default/ui/badge"
import { Button } from "@/registry/default/ui/button"
import { Input } from "@/registry/default/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
} from "@/registry/default/ui/input-group"
import { Kbd } from "@/registry/default/ui/kbd"
import { Label } from "@/registry/default/ui/label"
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@/registry/default/ui/menu"
import {
  NumberField,
  NumberFieldInput,
} from "@/registry/default/ui/number-field"
import {
  Popover,
  PopoverDescription,
  PopoverPopup,
  PopoverTitle,
  PopoverTrigger,
} from "@/registry/default/ui/popover"
import { Spinner } from "@/registry/default/ui/spinner"
import { Textarea } from "@/registry/default/ui/textarea"
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@/registry/default/ui/tooltip"

export default function Particle() {
  const { copyToClipboard, isCopied } = useCopyToClipboard()
  const [isFavorite, setIsFavorite] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <InputGroup>
        <Input type="search" placeholder="Search" aria-label="Search" />
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
      </InputGroup>

      <InputGroup>
        <Input type="email" placeholder="Email" aria-label="Email" />
        <InputGroupAddon align="inline-end">
          <MailIcon />
        </InputGroupAddon>
      </InputGroup>

      <InputGroup>
        <Input
          type="search"
          className="*:[input]:ps-1!"
          placeholder="coss"
          aria-label="Set your URL"
        />
        <InputGroupAddon>i.cal.com/</InputGroupAddon>
      </InputGroup>

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
            <PopoverPopup tooltipLike side="top">
              <p>The URL of your website</p>
            </PopoverPopup>
          </Popover>
        </InputGroupAddon>
      </InputGroup>

      <InputGroup>
        <Input type="password" placeholder="Password" aria-label="Password" />
        <InputGroupAddon align="inline-end">
          <Popover openOnHover>
            <PopoverTrigger render={<Button variant="ghost" size="icon-xs" />}>
              <InfoIcon />
            </PopoverTrigger>
            <PopoverPopup tooltipLike side="top">
              <p>Password must be at least 8 characters long</p>
            </PopoverPopup>
          </Popover>
        </InputGroupAddon>
      </InputGroup>

      <InputGroup>
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          aria-label="Password with toggle visibility"
        />
        <InputGroupAddon align="inline-end">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                />
              }
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </TooltipTrigger>
            <TooltipPopup>
              {showPassword ? "Hide password" : "Show password"}
            </TooltipPopup>
          </Tooltip>
        </InputGroupAddon>
      </InputGroup>

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

      <InputGroup>
        <Input
          type="text"
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
        <Input
          type="text"
          placeholder="https://x.com/shadcn"
          aria-label="Url"
          readOnly
        />
        <InputGroupAddon align="inline-end">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  aria-label="Copy"
                  title="Copy"
                  size="icon-xs"
                  onClick={() => {
                    copyToClipboard("https://x.com/shadcn")
                  }}
                />
              }
            >
              {isCopied ? <CheckIcon /> : <CopyIcon />}
            </TooltipTrigger>
            <TooltipPopup>
              <p>Copy to clipboard</p>
            </TooltipPopup>
          </Tooltip>
        </InputGroupAddon>
      </InputGroup>

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
        <Input type="text" aria-label="Url" />
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
        <Input type="search" placeholder="Type to search…" />
        <InputGroupAddon align="inline-end">
          <Button variant="secondary" size="xs">
            Search
          </Button>
        </InputGroupAddon>
      </InputGroup>

      <InputGroup>
        <Input type="search" placeholder="Type to search…" />
        <InputGroupAddon align="inline-end">
          <Badge variant="info">Badge</Badge>
        </InputGroupAddon>
      </InputGroup>

      <InputGroup>
        <Input type="search" placeholder="Search…" />
        <InputGroupAddon align="inline-end">
          <Kbd>/</Kbd>
        </InputGroupAddon>
      </InputGroup>

      <InputGroup>
        <Input type="search" placeholder="Search…" />
        <InputGroupAddon align="inline-end">
          <Kbd>⌘K</Kbd>
        </InputGroupAddon>
      </InputGroup>

      <InputGroup>
        <Input id="email-1" type="email" placeholder="team@coss.com" />
        <InputGroupAddon align="block-start">
          <Label htmlFor="email-1" className="text-foreground">
            Email
          </Label>
          <Popover openOnHover>
            <PopoverTrigger
              className="ml-auto"
              render={
                <Button variant="ghost" size="icon-xs" className="-m-1" />
              }
            >
              <InfoIcon />
            </PopoverTrigger>
            <PopoverPopup tooltipLike side="top">
              <p>We&apos;ll use this to send you notifications</p>
            </PopoverPopup>
          </Popover>
        </InputGroupAddon>
      </InputGroup>

      <InputGroup>
        <Input type="search" placeholder="Searching…" disabled />
        <InputGroupAddon align="inline-end">
          <Spinner />
        </InputGroupAddon>
      </InputGroup>

      <InputGroup>
        <Input type="search" placeholder="Processing…" disabled />
        <InputGroupAddon>
          <Spinner />
        </InputGroupAddon>
      </InputGroup>

      <InputGroup>
        <Textarea placeholder="Ask, Search or Chat…" />
        <InputGroupAddon align="block-end">
          <Menu>
            <Tooltip>
              <TooltipTrigger
                render={
                  <MenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="rounded-full"
                        aria-label="Add files"
                      />
                    }
                  >
                    <PlusIcon />
                  </MenuTrigger>
                }
              />
              <TooltipPopup>Add files and more</TooltipPopup>
            </Tooltip>
            <MenuPopup align="start">
              <MenuItem>Add photos &amp; files</MenuItem>
              <MenuItem>Create image</MenuItem>
              <MenuItem>Thinking</MenuItem>
              <MenuItem>Deep research</MenuItem>
            </MenuPopup>
          </Menu>
          <InputGroupText className="ml-auto">78% used</InputGroupText>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="default"
                  className="rounded-full"
                  size="icon-sm"
                  aria-label="Send"
                >
                  <ArrowUpIcon />
                </Button>
              }
            />
            <TooltipPopup>Send</TooltipPopup>
          </Tooltip>
        </InputGroupAddon>
      </InputGroup>

      <InputGroup>
        <Textarea placeholder="Enter your message" />
        <InputGroupAddon align="block-end">
          <InputGroupText className="text-xs text-muted-foreground">
            120 characters left
          </InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}
