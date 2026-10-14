"use client";

import { Button } from "@coss/ui/components/button";
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import { cn } from "@coss/ui/lib/utils";
import { parseQuickAdd, QUICK_ADD_KIND_ORDER, QUICK_ADD_KINDS, type QuickAddTokenKind } from "kloq";
import { useMemo, useState } from "react";
import { Pane, ToolCard } from "./tool-parts";
import { useNow } from "./use-now";

const EXAMPLES = [
  "lunch with sam@acme.com tomorrow 1pm for 90 minutes",
  "standup every weekday at 9:30 in the Blue Room",
  "flight to Lisbon on 14 Nov all day",
  "1:1 with jo@team.dev next Thursday 3-4pm",
  "dentist 12/08 08:45",
];

const WHEN = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

const CONFIDENCE: Record<"none" | "partial" | "full", { label: string; className: string }> = {
  none: { label: "nothing recognised", className: "text-muted-foreground" },
  partial: { label: "partial — a day or a time, not both", className: "text-warning-foreground" },
  full: { label: "full — a day and a time", className: "text-success-foreground" },
};

const BLANK = <span className="text-muted-foreground">—</span>;

function Fact({
  term,
  className,
  children,
}: {
  term: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-2xs text-muted-foreground">{term}</dt>
      <dd className={cn("mt-0.5 text-sm wrap-anywhere", className)}>{children}</dd>
    </div>
  );
}

export function QuickAddParser() {
  const [text, setText] = useState(EXAMPLES[0]);
  const now = useNow();
  const result = useMemo(() => parseQuickAdd(text, now ?? new Date(0)), [text, now]);

  const segments = useMemo(() => {
    const out: { text: string; kind: QuickAddTokenKind | null }[] = [];
    let cursor = 0;
    for (const token of result.tokens) {
      if (token.start > cursor) out.push({ text: text.slice(cursor, token.start), kind: null });
      out.push({ text: text.slice(token.start, token.end), kind: token.kind });
      cursor = token.end;
    }
    if (cursor < text.length) out.push({ text: text.slice(cursor), kind: null });
    return out;
  }, [text, result.tokens]);

  const kinds = QUICK_ADD_KIND_ORDER.filter((kind) => result.tokens.some((t) => t.kind === kind));
  const confidence = CONFIDENCE[result.confidence];

  return (
    <ToolCard>
      <Pane>
        <Field className="items-stretch">
          <FieldLabel>Type a sentence</FieldLabel>
          <Input
            size="lg"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder="coffee with alex tomorrow at 10 for 45 minutes"
          />
        </Field>
        <div role="group" aria-label="Examples" className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <Button
              key={e}
              size="xs"
              variant="outline"
              className="max-w-full"
              onClick={() => setText(e)}
            >
              <span className="min-w-0 truncate">{e}</span>
            </Button>
          ))}
        </div>
      </Pane>

      <Pane label="what it understood">
        <p className="font-mono text-lg leading-loose wrap-anywhere">
          {segments.length === 0 ? (
            <span className="text-muted-foreground">…</span>
          ) : (
            segments.map((seg, i) =>
              seg.kind ? (
                <span
                  key={i}
                  className={cn(
                    "rounded-xs underline decoration-2 underline-offset-4",
                    QUICK_ADD_KINDS[seg.kind].mark,
                  )}
                >
                  {seg.text}
                  <span className="sr-only"> ({QUICK_ADD_KINDS[seg.kind].label})</span>
                </span>
              ) : (
                <span key={i}>{seg.text}</span>
              ),
            )
          )}
        </p>
        {kinds.length > 0 && (
          <p
            aria-hidden
            className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-2xs text-muted-foreground"
          >
            {kinds.map((kind) => (
              <span key={kind} className="flex items-center gap-1.5">
                <span className={cn("h-0.5 w-3 rounded-full", QUICK_ADD_KINDS[kind].swatch)} />
                {QUICK_ADD_KINDS[kind].label}
              </span>
            ))}
          </p>
        )}
      </Pane>

      <Pane label="the event it would create">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          <Fact term="title">{result.title || BLANK}</Fact>
          <Fact term="when" className="tabular-nums">
            {!now ? (
              <span className="text-muted-foreground">…</span>
            ) : result.start ? (
              result.allDay ? (
                `${WHEN.format(result.start).split(",")[0]}, all day`
              ) : (
                WHEN.format(result.start)
              )
            ) : (
              BLANK
            )}
          </Fact>
          <Fact term="duration" className="tabular-nums">
            {result.durationMin != null ? `${result.durationMin} min` : BLANK}
          </Fact>
          <Fact term="attendees">
            {result.attendees.length ? result.attendees.join(", ") : BLANK}
          </Fact>
          <Fact term="location">{result.location ?? BLANK}</Fact>
          <Fact term="confidence" className={confidence.className}>
            <span role="status">
              {result.confidence === "full" && result.allDay
                ? "full — a whole day"
                : confidence.label}
            </span>
          </Fact>
        </dl>
      </Pane>
    </ToolCard>
  );
}
