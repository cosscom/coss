"use client";

import type { KeyboardEvent, ReactElement, ReactNode, RefObject } from "react";
import { useId, useRef, useState } from "react";
import { useMediaQuery } from "@/registry/default/hooks/use-media-query";
import { cn } from "@/registry/default/lib/utils";
import { ChatComposerField } from "./chat-composer-field";
import { ChatMentionSuggestions } from "./chat-mentions";
import {
  deleteMentionBackward,
  getMentionQuery,
  insertMention,
} from "./lib/chat-mention-text";

export type ChatMentionOption = {
  id: string;
  name: string;
  insertText: string;
  avatar?: ReactNode;
};
export type ChatComposerProps = {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: (value: string) => void;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  mentions?: { options: readonly ChatMentionOption[]; label: string };
  textareaLabel: string;
  sendLabel: string;
  placeholder?: string;
  notice?: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
};

export function ChatComposer({
  draft,
  onDraftChange,
  onSend,
  textareaRef: suppliedTextareaRef,
  mentions,
  textareaLabel,
  sendLabel,
  placeholder,
  notice,
  hint,
  disabled = false,
  compact: compactProp,
  className,
}: ChatComposerProps): ReactElement {
  const suggestionId = useId();
  const hintId = useId();
  const ownTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = suppliedTextareaRef ?? ownTextareaRef;
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const [caret, setCaret] = useState(0);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const touchInput = useMediaQuery({ pointer: "coarse" });
  const wideViewport = useMediaQuery("md");
  const compact = compactProp ?? !wideViewport;
  const mention = !mentions || dismissed ? null : getMentionQuery(draft, caret);
  const suggestions = (mentions?.options ?? []).filter((option) =>
    option.insertText
      .toLowerCase()
      .startsWith(mention?.query.toLowerCase() ?? ""),
  );
  const showSuggestions = Boolean(mention && suggestions.length);

  const focusAt = (position: number): void => {
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(position, position);
    });
  };

  const selectMention = (id: string): void => {
    const option = mentions?.options.find((item) => item.id === id);
    if (!option) return;
    if (!mention) return;
    const result = insertMention(draft, mention, option.insertText);
    onDraftChange(result.text);
    setCaret(result.caret);
    setDismissed(true);
    focusAt(result.caret);
  };

  const send = (): void => {
    if (disabled || !draft.trim()) return;
    onSend(draft.trim());
    setCaret(0);
    setDismissed(false);
    focusAt(0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)
      return;
    if (touchInput && event.key === "Enter") return;
    if (
      mentions &&
      event.key === "Backspace" &&
      (event.altKey || event.ctrlKey)
    ) {
      const textarea = event.currentTarget;
      if (textarea.selectionStart === textarea.selectionEnd) {
        const result = deleteMentionBackward(draft, textarea.selectionStart);
        if (result) {
          event.preventDefault();
          onDraftChange(result.text);
          setCaret(result.caret);
          setDismissed(true);
          focusAt(result.caret);
          return;
        }
      }
    }
    if (mention) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setDismissed(true);
        return;
      }
      if (
        suggestions.length &&
        (event.key === "ArrowDown" || event.key === "ArrowUp")
      ) {
        event.preventDefault();
        setActiveSuggestion(
          (current) =>
            (current +
              (event.key === "ArrowDown" ? 1 : -1) +
              suggestions.length) %
            suggestions.length,
        );
        return;
      }
      if (suggestions.length && event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        const suggestion = suggestions[activeSuggestion] ?? suggestions[0];
        if (suggestion) selectMention(suggestion.id);
        return;
      }
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  return (
    <form
      className={cn("relative z-20 flex shrink-0 flex-col gap-2.5", className)}
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <fieldset
        disabled={disabled}
        className="m-0 min-w-0 border-0 p-0 disabled:opacity-50"
      >
        <div ref={fieldRef} className="relative">
          {mentions && (
            <ChatMentionSuggestions
              id={suggestionId}
              open={showSuggestions}
              label={mentions.label}
              options={suggestions}
              activeId={(suggestions[activeSuggestion] ?? suggestions[0])?.id}
              onActiveIdChange={(id) =>
                setActiveSuggestion(
                  suggestions.findIndex((option) => option.id === id),
                )
              }
              anchor={fieldRef}
              onDismiss={() => setDismissed(true)}
              onSelect={selectMention}
            />
          )}
          <ChatComposerField
            textareaLabel={textareaLabel}
            scrollAreaRef={scrollAreaRef}
            sendLabel={sendLabel}
            sendDisabled={!draft.trim()}
            sendPlacement={compact ? "inline-end" : "block-end"}
            textareaProps={{
              ref: textareaRef,
              rows: 1,
              value: draft,
              enterKeyHint: touchInput ? "enter" : undefined,
              "aria-describedby": touchInput ? undefined : hintId,
              "aria-autocomplete": mentions ? "list" : undefined,
              "aria-expanded": mentions ? showSuggestions : undefined,
              "aria-controls": showSuggestions ? suggestionId : undefined,
              "aria-activedescendant": showSuggestions
                ? `${suggestionId}-${(suggestions[activeSuggestion] ?? suggestions[0])?.id}`
                : undefined,
              placeholder,
              onKeyDown,
              onSelect: (event) => setCaret(event.currentTarget.selectionStart),
              onChange: (event) => {
                const textarea = event.currentTarget;
                const caretAtEnd =
                  textarea.selectionEnd === textarea.value.length;
                onDraftChange(event.target.value);
                setCaret(event.target.selectionStart);
                setActiveSuggestion(0);
                setDismissed(false);
                if (caretAtEnd) {
                  window.requestAnimationFrame(() => {
                    const viewport =
                      scrollAreaRef.current?.querySelector<HTMLDivElement>(
                        ':scope > [data-slot="scroll-area-viewport"]',
                      );
                    if (viewport) viewport.scrollTop = viewport.scrollHeight;
                  });
                }
              },
            }}
          />
        </div>
      </fieldset>
      <div
        className={cn(
          touchInput && !notice
            ? "sr-only"
            : "flex min-h-4 items-center justify-between px-1 text-muted-foreground text-xs",
          disabled && "opacity-50",
        )}
      >
        <span role="status" aria-live="polite">
          {notice}
        </span>
        {!touchInput && (
          <span
            id={hintId}
            className={notice ? "sr-only" : "ms-auto pointer-coarse:hidden"}
          >
            {hint}
          </span>
        )}
      </div>
    </form>
  );
}
