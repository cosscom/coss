"use client"

import { useRef } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"

import { useCopyToClipboard } from "@/registry/default/hooks/use-copy-to-clipboard"
import { Button } from "@/registry/default/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/registry/default/ui/input-group"
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@/registry/default/ui/tooltip"

export default function InputGroupWithIconButton() {
  const { copyToClipboard, isCopied } = useCopyToClipboard()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <InputGroup>
      <InputGroupInput
        ref={inputRef}
        type="text"
        defaultValue="https://coss.com"
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
                  if (inputRef.current) {
                    copyToClipboard(inputRef.current.value)
                  }
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
