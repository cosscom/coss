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
      <InputGroupTextarea className="*:pt-1!" placeholder="Tell us about yourself…" />
      <InputGroupAddon align="block-start" className="px-2 py-2 gap-1">
        <Toggle size="sm" aria-label="Toggle bold">
          <BoldIcon />
        </Toggle>
        <Toggle size="sm" aria-label="Toggle italic">
          <ItalicIcon />
        </Toggle>
        <Button variant="ghost" size="icon-sm" aria-label="Link">
          <LinkIcon />
        </Button>
      </InputGroupAddon>
    </InputGroup>
  );
}

