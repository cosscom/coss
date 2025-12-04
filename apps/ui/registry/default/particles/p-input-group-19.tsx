"use client";

import { BoldIcon, ItalicIcon, LinkIcon } from "lucide-react";

import { Button } from "@/registry/default/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/registry/default/ui/input-group";
import { Toggle } from "@/registry/default/ui/toggle";

export default function Particle() {
  return (
    <InputGroup>
      <InputGroupTextarea placeholder="Tell us about yourself…" />
      <InputGroupAddon
        align="block-start"
        className="gap-1 rounded-t-lg border-b bg-muted/50 p-2!"
      >
        <Toggle aria-label="Toggle bold" size="sm">
          <BoldIcon />
        </Toggle>
        <Toggle aria-label="Toggle italic" size="sm">
          <ItalicIcon />
        </Toggle>
        <Button aria-label="Link" size="icon-sm" variant="ghost">
          <LinkIcon />
        </Button>
      </InputGroupAddon>
    </InputGroup>
  );
}
