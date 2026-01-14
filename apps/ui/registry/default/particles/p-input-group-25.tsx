"use client";

import { useId, useState } from "react";

import { Input } from "@/registry/default/ui/input";
import { Label } from "@/registry/default/ui/label";

export default function Particle() {
  const id = useId();
  const maxLength = 8;
  const [value, setValue] = useState("");

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Code</Label>
      <Input
        id={id}
        maxLength={maxLength}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter code"
        type="text"
        value={value}
      />
      <p
        aria-live="polite"
        className="text-muted-foreground text-xs"
        role="status"
      >
        <span className="tabular-nums">{maxLength - value.length}</span>{" "}
        characters left
      </p>
    </div>
  );
}
