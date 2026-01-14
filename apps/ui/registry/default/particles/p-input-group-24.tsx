"use client";

import { useId, useState } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/registry/default/ui/input-group";
import { Label } from "@/registry/default/ui/label";

export default function Particle() {
  const id = useId();
  const maxLength = 14;
  const [value, setValue] = useState("");

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Username</Label>
      <InputGroup>
        <InputGroupInput
          id={id}
          maxLength={maxLength}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter username"
          type="text"
          value={value}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupText
            aria-live="polite"
            className="text-xs tabular-nums"
            role="status"
          >
            {value.length}/{maxLength}
          </InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
