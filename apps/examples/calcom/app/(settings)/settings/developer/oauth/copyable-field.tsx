"use client";

import { Button } from "@coss/ui/components/button";
import { Field, FieldLabel } from "@coss/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@coss/ui/components/input-group";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { useCopyToClipboard } from "@coss/ui/hooks/use-copy-to-clipboard";
import { CheckIcon, CopyIcon } from "lucide-react";

interface CopyableFieldProps {
  label: string;
  value: string;
  "aria-label": string;
}

export function CopyableField({
  label,
  value,
  "aria-label": ariaLabel,
}: CopyableFieldProps) {
  const { copyToClipboard, isCopied } = useCopyToClipboard();

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <InputGroup>
        <InputGroupInput
          aria-label={ariaLabel}
          className="font-mono"
          readOnly
          value={value}
        />
        <InputGroupAddon align="inline-end">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={`Copy ${label}`}
                  onClick={() => copyToClipboard(value)}
                  size="icon-xs"
                  variant="ghost"
                />
              }
            >
              {isCopied ? <CheckIcon /> : <CopyIcon />}
            </TooltipTrigger>
            <TooltipPopup>
              <p>{isCopied ? "Copied!" : "Copy to clipboard"}</p>
            </TooltipPopup>
          </Tooltip>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  );
}
