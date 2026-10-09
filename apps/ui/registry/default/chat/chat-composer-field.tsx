"use client";

import { ArrowUpIcon } from "lucide-react";
import type { ReactElement, RefObject } from "react";
import { cn } from "@/registry/default/lib/utils";
import { Button } from "@/registry/default/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/registry/default/ui/input-group";
import { ScrollArea } from "@/registry/default/ui/scroll-area";
import type { TextareaProps } from "@/registry/default/ui/textarea";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@/registry/default/ui/tooltip";

export type ChatComposerFieldProps = {
  textareaProps: Omit<TextareaProps, "unstyled" | "aria-label">;
  textareaLabel: string;
  sendLabel: string;
  sendDisabled: boolean;
  sendPlacement?: "block-end" | "inline-end";
  scrollAreaRef?: RefObject<HTMLDivElement | null>;
};

export function ChatComposerField({
  textareaProps,
  textareaLabel,
  sendLabel,
  sendDisabled,
  sendPlacement = "block-end",
  scrollAreaRef,
}: ChatComposerFieldProps): ReactElement {
  const inlineSend = sendPlacement === "inline-end";
  const input = (
    <InputGroupTextarea
      {...textareaProps}
      aria-label={textareaLabel}
      className={cn(
        "flex-1 *:block *:overflow-hidden",
        inlineSend && "*:min-h-0! *:min-w-0 *:py-1.25!",
        textareaProps.className,
      )}
    />
  );

  return (
    <InputGroup
      className={cn(
        inlineSend &&
          "items-end rounded-[1.125rem] leading-6 before:rounded-[calc(1.125rem-1px)] sm:text-base",
      )}
    >
      <ScrollArea
        ref={scrollAreaRef}
        scrollFade
        className={cn(
          "h-auto min-w-0 overflow-hidden pointer-coarse:[&>[data-slot=scroll-area-scrollbar]]:hidden",
          inlineSend
            ? "max-h-24 *:data-[slot=scroll-area-viewport]:max-h-24"
            : "max-h-36 *:data-[slot=scroll-area-viewport]:max-h-36",
        )}
        data-slot="chat-composer-scroll-area"
      >
        {input}
      </ScrollArea>
      <InputGroupAddon
        align={sendPlacement}
        className={cn(
          "justify-end",
          inlineSend && "self-end py-0.75 pe-0.75 has-[>button]:me-0",
        )}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="submit"
                size={inlineSend ? "icon-xs" : "icon"}
                disabled={sendDisabled}
                aria-label={sendLabel}
                className={cn(
                  "rounded-full transition-transform before:rounded-full active:scale-95 disabled:border-transparent disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 motion-reduce:transform-none",
                  inlineSend && "sm:size-7",
                )}
              />
            }
          >
            <ArrowUpIcon
              className={inlineSend ? "size-4" : "size-4.5"}
              aria-hidden="true"
            />
          </TooltipTrigger>
          <TooltipPopup side="bottom">{sendLabel}</TooltipPopup>
        </Tooltip>
      </InputGroupAddon>
    </InputGroup>
  );
}
