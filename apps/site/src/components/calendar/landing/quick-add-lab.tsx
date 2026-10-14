"use client";

import { Toggle } from "@coss/ui/components/toggle";
import { cn } from "@coss/ui/lib/utils";
import {
  type CalEvent,
  type MoveTarget,
  MoveToInput,
  parseQuickAdd,
  QuickAddInput,
  quickAddPreview,
} from "kloq";
import { ArrowLeft } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Pin } from "@/components/calendar/site/pin";
import { localInstant } from "@/lib/calendar/local-instant";

const EXAMPLES = [
  "lunch with sam@acme.com tomorrow 1pm at Padella",
  "deep work for 90 minutes at 2pm",
  "party friday 9pm to midnight",
  "offsite all day on 12 Aug",
  "coffee next friday morning",
  "review 1-2pm",
];

const MOVES = ["friday 3pm", "+2h", "next tuesday", "an hour earlier", "tomorrow morning"];

/* "now", once per page load, only on the client: the server renders the empty frames. */
let clientNow: Date | null = null;
const noop = () => () => {};
const useNow = () =>
  useSyncExternalStore(
    noop,
    () => (clientNow ??= new Date()),
    () => null,
  );

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Types each example once while the field is on screen, then rests on the first.
 * Reduced motion gets that resting state straight away; the visitor taking over ends it.
 */
function useTypewriter(active: boolean, visible: boolean, onText: (s: string) => void) {
  const done = useRef(false);
  const at = useRef({ i: 0, pos: 0 });
  useEffect(() => {
    if (!active || done.current) return;
    if (reducedMotion()) {
      done.current = true;
      onText(EXAMPLES[0]);
      return;
    }
    if (!visible) return;
    let timer = 0;
    const step = () => {
      const { i, pos } = at.current;
      if (i >= EXAMPLES.length) {
        done.current = true;
        onText(EXAMPLES[0]);
        return;
      }
      const text = EXAMPLES[i];
      if (pos <= text.length) {
        onText(text.slice(0, pos));
        at.current = { i, pos: pos + 1 };
        timer = window.setTimeout(step, 38 + Math.random() * 40);
      } else {
        at.current = { i: i + 1, pos: 0 };
        timer = window.setTimeout(step, 2600);
      }
    };
    timer = window.setTimeout(step, 400);
    return () => window.clearTimeout(timer);
  }, [active, visible, onText]);
}

/** The ⌘K popup's frame and nested-surface header, inline and always open. */
function Surface({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-clip rounded-2xl border bg-popover text-popover-foreground shadow-lg",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <span className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground">
          <ArrowLeft className="size-3.5" />
          Back
        </span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      {children}
    </div>
  );
}

export function QuickAddLab() {
  const now = useNow();

  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const [visible, setVisible] = useState(false);
  const field = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useTypewriter(now !== null && !touched, visible, setValue);
  const result = useMemo(() => (now ? parseQuickAdd(value, now) : null), [value, now]);
  const [created, setCreated] = useState<string | null>(null);

  const [move, setMove] = useState(MOVES[0]);
  const [moved, setMoved] = useState<MoveTarget | null>(null);
  const lunch = useMemo<CalEvent | null>(() => {
    if (!now) return null;
    const start = new Date(now);
    start.setHours(12, 0, 0, 0);
    const end = new Date(start);
    end.setHours(13);
    return {
      id: "lunch",
      title: "Lunch with Sam",
      color: "blue",
      start: localInstant(start),
      end: localInstant(end),
    };
  }, [now]);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-14">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Pin n={1} /> The ⌘K quick-add screen, as shipped. Type into it — or just watch.
        </p>
        <Surface title="Quick add" className="mt-3">
          <div ref={field} className="min-h-41.25" onFocusCapture={() => setTouched(true)}>
            {now && result && (
              <QuickAddInput
                value={value}
                onValueChange={(v) => {
                  setTouched(true);
                  setValue(v);
                }}
                result={result}
                now={now}
                autoFocus={false}
                announce={touched}
                onCommit={() => {
                  const p = quickAddPreview(result, now);
                  setCreated(`${p.title}${p.when ? ` · ${p.when}` : ""}`);
                  setValue("");
                }}
              />
            )}
          </div>
        </Surface>
        <p className="mt-3 min-h-5 font-mono text-xs text-muted-foreground" aria-live="polite">
          {created && (
            <span className="text-foreground">
              <span className="text-success-foreground">✓</span> created — {created}
            </span>
          )}
        </p>
      </div>

      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Pin n={2} /> Move it in English — the same screen, for a selected event.
        </p>
        <Surface title={`Move "Lunch with Sam"`} className="mt-3">
          <div className="min-h-36 sm:min-h-26.25">
            {now && lunch && (
              <MoveToInput
                value={move}
                onValueChange={setMove}
                event={lunch}
                now={now}
                autoFocus={false}
                onCommit={(t) => {
                  setMoved(t);
                  setMove("");
                }}
                onBack={() => setMove("")}
              />
            )}
          </div>
        </Surface>
        <div role="group" aria-label="Example moves" className="mt-3 flex flex-wrap gap-1.5">
          {MOVES.map((m) => (
            <Toggle
              key={m}
              size="sm"
              variant="outline"
              className="font-mono"
              pressed={m === move}
              onPressedChange={() => setMove(m)}
            >
              {m}
            </Toggle>
          ))}
        </div>
        <p className="mt-3 min-h-5 font-mono text-xs text-muted-foreground" aria-live="polite">
          {moved && (
            <span className="text-foreground">
              <span className="text-success-foreground">✓</span> moved —{" "}
              {moved.start.toLocaleString(undefined, {
                weekday: "short",
                hour: "numeric",
                minute: "2-digit",
              })}
              {moved.relative
                ? " · relative shift"
                : ` · ${[moved.changed.date && "date", moved.changed.time && "time"].filter(Boolean).join(" + ")} replaced`}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
