"use client";

import { AtSignIcon, SmileIcon } from "lucide-react";

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
      <InputGroupTextarea placeholder="Write a comment…" />
      <InputGroupAddon align="block-end" className="justify-between">
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button aria-label="Add emoji" size="icon-sm" variant="ghost" />
              }
            >
              <SmileIcon />
            </TooltipTrigger>
            <TooltipPopup>Add emoji</TooltipPopup>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="Mention someone"
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              <AtSignIcon />
            </TooltipTrigger>
            <TooltipPopup>Mention someone</TooltipPopup>
          </Tooltip>
        </div>
        <Button size="sm">Comment</Button>
      </InputGroupAddon>
    </InputGroup>
  );
}
