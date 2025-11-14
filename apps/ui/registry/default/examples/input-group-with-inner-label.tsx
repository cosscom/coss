"use client";

import { InfoIcon } from "lucide-react";

import { Button } from "@/registry/default/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/registry/default/ui/input-group";
import { Label } from "@/registry/default/ui/label";
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@/registry/default/ui/popover";

export default function InputGroupWithInnerLabel() {
  return (
    <InputGroup>
      <InputGroupInput id="email-1" type="email" placeholder="team@coss.com" />
      <InputGroupAddon align="block-start">
        <Label htmlFor="email-1" className="text-foreground">
          Email
        </Label>
        <Popover openOnHover>
          <PopoverTrigger
            className="ml-auto"
            render={<Button variant="ghost" size="icon-xs" className="-m-1" />}
          >
            <InfoIcon />
          </PopoverTrigger>
          <PopoverPopup tooltipStyle side="top">
            <p>We&apos;ll use this to send you notifications</p>
          </PopoverPopup>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  );
}
