"use client"

import { ArrowUpIcon, PlusIcon } from "lucide-react"

import { Button } from "@/registry/default/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
} from "@/registry/default/ui/input-group"
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@/registry/default/ui/menu"
import { Textarea } from "@/registry/default/ui/textarea"
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@/registry/default/ui/tooltip"

export default function InputGroupTextarea() {
  return (
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
  )
}
