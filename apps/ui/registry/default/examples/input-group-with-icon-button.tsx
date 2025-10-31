"use client"

import { CheckIcon, CopyIcon } from "lucide-react"

import { useCopyToClipboard } from "@/registry/default/hooks/use-copy-to-clipboard"
import { Button } from "@/registry/default/ui/button"
import { Input } from "@/registry/default/ui/input"
import { InputGroup, InputGroupAddon } from "@/registry/default/ui/input-group"
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@/registry/default/ui/tooltip"

export default function InputGroupWithIconButton() {
  const { copyToClipboard, isCopied } = useCopyToClipboard()

  return (
    <InputGroup>
      <Input
        type="text"
        placeholder="https:/coss.com"
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
  )
}
