"use client";

import { CopyIcon } from "lucide-react";

import { Button } from "@/registry/default/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/registry/default/ui/input-group";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/registry/default/ui/select";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@/registry/default/ui/tooltip";

const languages = [
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "Python", value: "python" },
  { label: "Go", value: "go" },
  { label: "Rust", value: "rust" },
];

export default function Particle() {
  return (
    <InputGroup>
      <InputGroupAddon
        align="block-start"
        className="justify-between rounded-t-lg border-b bg-muted/72 p-2!"
      >
        <div onMouseDown={(e) => e.stopPropagation()}>
          <Select defaultValue="javascript" items={languages}>
            <SelectTrigger className="w-fit" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {languages.map(({ label, value }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button aria-label="Copy code" size="icon-sm" variant="ghost" />
            }
          >
            <CopyIcon />
          </TooltipTrigger>
          <TooltipPopup>Copy to clipboard</TooltipPopup>
        </Tooltip>
      </InputGroupAddon>
      <InputGroupTextarea
        className="font-mono"
        placeholder="Paste your code here…"
        rows={6}
      />
    </InputGroup>
  );
}
