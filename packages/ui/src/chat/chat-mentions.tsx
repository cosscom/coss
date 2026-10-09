"use client";

import { Button } from "@coss/ui/components/button";
import { Popover, PopoverPopup } from "@coss/ui/components/popover";
import { ScrollArea } from "@coss/ui/components/scroll-area";
import { cn } from "@coss/ui/lib/utils";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import { useEffect, useRef } from "react";

export type ChatMentionSuggestionsProps<TId extends string> = {
  id: string;
  open: boolean;
  label: string;
  options: readonly { id: TId; name: string; avatar?: ReactNode }[];
  activeId?: TId;
  anchor: ComponentProps<typeof PopoverPopup>["anchor"];
  onActiveIdChange?: (id: TId) => void;
  onDismiss: () => void;
  onSelect: (id: TId) => void;
};

export function ChatMentionSuggestions<TId extends string>({
  id,
  open,
  label,
  options,
  activeId,
  anchor,
  onActiveIdChange,
  onDismiss,
  onSelect,
}: ChatMentionSuggestionsProps<TId>): ReactElement | null {
  const activeRef = useRef<HTMLButtonElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Changing the active option must scroll its updated ref into view.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() =>
      activeRef.current?.scrollIntoView({ block: "nearest" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [activeId, open]);
  if (!options.length) return null;
  return (
    <Popover open={open} onOpenChange={(nextOpen) => !nextOpen && onDismiss()}>
      <PopoverPopup
        anchor={anchor}
        side="top"
        align="start"
        id={id}
        role="listbox"
        aria-label={label}
        initialFocus={false}
        finalFocus={false}
        data-slot="chat-mention-suggestions"
        className="h-auto! w-72 max-w-(--available-width) [&>[data-slot=popover-viewport]]:overflow-visible [&>[data-slot=popover-viewport]]:p-0 [&>[data-slot=popover-viewport]]:[--viewport-inline-padding:0px]"
      >
        <ScrollArea
          overscrollContain
          scrollbarGutter
          scrollFade
          className="max-h-[min(var(--available-height),16rem)] *:data-[slot=scroll-area-viewport]:max-h-[min(var(--available-height),16rem)]"
        >
          <div className="scroll-py-1 px-1 py-1">
            {options.map((option) => (
              <Button
                key={option.id}
                ref={option.id === activeId ? activeRef : undefined}
                id={`${id}-${option.id}`}
                role="option"
                aria-selected={option.id === activeId}
                tabIndex={-1}
                variant="ghost"
                className={cn(
                  "flex h-auto min-h-8 w-full cursor-default select-none justify-start gap-2 rounded-sm border-0 py-1 ps-2 pe-2 text-start font-normal before:rounded-sm sm:h-auto sm:min-h-7",
                  option.id === activeId && "bg-accent text-accent-foreground",
                )}
                onPointerMove={() => onActiveIdChange?.(option.id)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelect(option.id)}
              >
                {option.avatar && (
                  <span aria-hidden="true" className="flex shrink-0">
                    {option.avatar}
                  </span>
                )}
                <span className="min-w-0 truncate">{option.name}</span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </PopoverPopup>
    </Popover>
  );
}
