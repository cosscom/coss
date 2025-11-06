import { MicIcon, PaperclipIcon } from "lucide-react"

import { Button } from "@/registry/default/ui/button"
import { Group } from "@/registry/default/ui/group"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/registry/default/ui/input-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/registry/default/ui/tooltip"

export default function GroupInputGroup() {
  return (
    <Group
      className="[--radius-lg:9999px] [--radius:9999rem]"
      aria-label="Message composer"
    >
      <Group aria-label="Attachments">
        <Button variant="outline" size="icon">
          <PaperclipIcon />
        </Button>
      </Group>
      <Group aria-label="Message input">
        <InputGroup>
          <InputGroupInput placeholder="Send a message" />
          <InputGroupAddon align="inline-end">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Voice Mode"
                  />
                }
              >
                <MicIcon />
              </TooltipTrigger>
              <TooltipContent>Voice Mode</TooltipContent>
            </Tooltip>
          </InputGroupAddon>
        </InputGroup>
      </Group>
    </Group>
  )
}
