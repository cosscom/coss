"use client";

import { Button } from "@coss/ui/components/button";
import { Input } from "@coss/ui/components/input";
import { Kbd } from "@coss/ui/components/kbd";
import { cn } from "@coss/ui/lib/utils";
import {
  type CalEvent,
  formatInstant,
  highlightSegments,
  Kloq,
  newEventId,
  parseQuickAdd,
  QUICK_ADD_KINDS,
  quickAddPreview,
  toDateOnlyString,
  useKloq,
  useKloqStore,
} from "kloq";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Bar } from "../parts";
import { EVENTS, PHRASES } from "./data";

// each kind's own underline style and tint come from `QUICK_ADD_KINDS[kind].mark`
const MARK = "rounded-xs underline decoration-2 underline-offset-4";

const dayAfter = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

function Planner() {
  const store = useKloqStore();
  const k = useKloq();
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [added, setAdded] = useState<string | null>(null);

  const { result, preview } = useMemo(() => {
    const now = new Date();
    const result = parseQuickAdd(text, now, { defaultDurationMin: 60 });
    return { result, preview: quickAddPreview(result, now) };
  }, [text]);
  const segments = highlightSegments(text, result.tokens, result.ignored);

  // the mirror takes its box and type from the input it lies on, so it tracks whatever the Input renders
  useLayoutEffect(() => {
    const input = inputRef.current;
    const mirror = mirrorRef.current;
    if (!input || !mirror) return;
    const fit = () => {
      const s = getComputedStyle(input);
      const frame = mirror.offsetParent?.getBoundingClientRect();
      const box = input.getBoundingClientRect();
      Object.assign(mirror.style, {
        left: `${box.left - (frame?.left ?? 0)}px`,
        top: `${box.top - (frame?.top ?? 0)}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
        padding: s.padding,
        font: s.font,
        letterSpacing: s.letterSpacing,
        lineHeight: s.lineHeight,
      });
    };
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(input);
    return () => watch.disconnect();
  }, []);

  // a sentence wider than the box scrolls inside the input; the mirror has to follow it
  const follow = () => {
    if (mirrorRef.current && inputRef.current)
      mirrorRef.current.scrollLeft = inputRef.current.scrollLeft;
  };

  const commit = () => {
    if (!result.start || !result.end) return;
    const base = {
      id: newEventId(),
      title: preview.title,
      color: "emerald" as const,
      ...(result.location ? { location: result.location } : {}),
      ...(result.attendees.length
        ? { attendees: result.attendees.map((email) => ({ email })) }
        : {}),
    };
    // the parser's all-day `end` is the inclusive last day; the store's is exclusive
    const event: CalEvent = result.allDay
      ? {
          ...base,
          allDay: true,
          start: toDateOnlyString(result.start),
          end: toDateOnlyString(dayAfter(result.end)),
        }
      : { ...base, start: formatInstant(result.start), end: formatInstant(result.end) };
    store.add(event);
    k.goToDate(result.start);
    setAdded(`${preview.title} · ${preview.when}`);
    setText("");
  };

  return (
    <>
      <div className="relative border-b px-4 py-2.5">
        <Input
          ref={inputRef}
          nativeInput
          value={text}
          onChange={(e) => setText(e.target.value)}
          onScroll={follow}
          onKeyUp={follow}
          onSelect={follow}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") setText("");
          }}
          placeholder="What are you planning? — “gym tomorrow morning for 45 mins”"
          aria-label="Plan an event in plain English"
          autoComplete="off"
          spellCheck={false}
        />
        <div
          ref={mirrorRef}
          aria-hidden
          className="pointer-events-none absolute overflow-hidden whitespace-pre text-transparent"
        >
          {segments.map((s, i) => (
            <span
              key={i}
              className={cn(
                // read, then overruled — a length beside an explicit range, say — is struck through, in no kind's colour
                s.ignored &&
                  "rounded-xs bg-muted line-through decoration-muted-foreground decoration-2",
                !s.ignored && s.kind && MARK,
                !s.ignored && s.kind && QUICK_ADD_KINDS[s.kind].mark,
              )}
            >
              {s.text}
            </span>
          ))}
        </div>
      </div>
      <Bar className="tabular-nums">
        {text.trim() ? (
          <>
            <span className="text-foreground">{preview.title}</span>
            <span>{preview.when}</span>
            {preview.chips.map((chip) => (
              <span key={chip}>· {chip}</span>
            ))}
            {result.tokens.map((t) => (
              <span key={t.start}>
                <span className={cn("px-0.5", MARK, QUICK_ADD_KINDS[t.kind].mark)}>
                  {QUICK_ADD_KINDS[t.kind].label}
                </span>{" "}
                <span className="text-foreground">“{t.text}”</span>
              </span>
            ))}
            {result.ignored.map((t) => (
              <span key={t.start}>
                ignored <s>“{t.text}”</s>
              </span>
            ))}
            <span className="ms-auto inline-flex items-center gap-1.5">
              <Kbd>↵</Kbd> add
            </span>
          </>
        ) : (
          <>
            {PHRASES.map((phrase) => (
              <Button
                key={phrase}
                variant="outline"
                size="xs"
                className="max-w-full"
                onClick={() => {
                  setText(phrase);
                  inputRef.current?.focus();
                }}
              >
                <span className="min-w-0 truncate">{phrase}</span>
              </Button>
            ))}
            {added ? (
              <span role="status" className="ms-auto text-foreground">
                <span className="text-success-foreground">✓</span> {added}
              </span>
            ) : null}
          </>
        )}
      </Bar>
    </>
  );
}

export default function QuickAddPlannerExample() {
  return (
    <div className="@container flex flex-col">
      <div className="h-136">
        <Kloq defaultEvents={EVENTS} persistence={false} designMode={false} storage={false}>
          <Planner />
          <Kloq.Toolbar />
        </Kloq>
      </div>
    </div>
  );
}
