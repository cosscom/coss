"use client";

import { ImageIcon, PaperclipIcon, SendIcon } from "lucide-react";

import { Button } from "@/registry/default/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/registry/default/ui/input-group";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@/registry/default/ui/tooltip";

export default function Particle() {
  return (
    <InputGroup>
      <InputGroupTextarea placeholder="Compose your message…" rows={4} />
      <InputGroupAddon align="block-end" className="justify-between">
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="Attach file"
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              <PaperclipIcon />
            </TooltipTrigger>
            <TooltipPopup>Attach file</TooltipPopup>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="Insert image"
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              <ImageIcon />
            </TooltipTrigger>
            <TooltipPopup>Insert image</TooltipPopup>
          </Tooltip>
        </div>
        <Button className="gap-2" size="sm">
          <SendIcon className="size-4" />
          Send
        </Button>
      </InputGroupAddon>
    </InputGroup>
  );
}
