"use client";

import { HashIcon, SparklesIcon } from "lucide-react";

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
      <InputGroupTextarea placeholder="What's on your mind?" rows={3} />
      <InputGroupAddon align="block-end" className="justify-between">
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button aria-label="Add tags" size="icon-sm" variant="ghost" />
              }
            >
              <HashIcon />
            </TooltipTrigger>
            <TooltipPopup>Add tags</TooltipPopup>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button aria-label="AI assist" size="icon-sm" variant="ghost" />
              }
            >
              <SparklesIcon />
            </TooltipTrigger>
            <TooltipPopup>AI assist</TooltipPopup>
          </Tooltip>
        </div>
        <Button size="sm">Post</Button>
      </InputGroupAddon>
    </InputGroup>
  );
}
