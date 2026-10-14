"use client";

import { Button } from "@coss/ui/components/button";
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import { describeRRule, expandRecurrence, parseRRule } from "kloq";
import { AlertCircle, Check } from "lucide-react";
import { useId, useMemo, useState, useSyncExternalStore } from "react";
import { CodePanes } from "@/components/calendar/site/code-panes";
import { Occurrences, occurrencesLabel, Pane, ToolCard } from "./tool-parts";
import { useNow } from "./use-now";

const EXAMPLES = [
  { rule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR", label: "Every weekday" },
  { rule: "FREQ=MONTHLY;BYDAY=-1FR", label: "Last Friday of the month" },
  { rule: "FREQ=WEEKLY;INTERVAL=2;BYDAY=TH", label: "Fortnightly" },
  { rule: "FREQ=MONTHLY;BYMONTHDAY=1;COUNT=12", label: "The 1st, twelve times" },
  { rule: "FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25", label: "Every Christmas" },
  { rule: "FREQ=DAILY;INTERVAL=3;UNTIL=20261231T000000Z", label: "Every third day, until" },
] as const;

const DEFAULT_RULE = "FREQ=MONTHLY;BYDAY=-1FR";
const SLOTS = 8;

const subscribeHash = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
};
const readHash = () => window.location.hash;
const noHash = () => "";

function ruleFromHash(hash: string) {
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return "";
  }
}

export function RRuleExplainer() {
  /* the builder links here with its rule in the fragment; typing wins until the fragment changes again */
  const hash = useSyncExternalStore(subscribeHash, readHash, noHash);
  const [draft, setDraft] = useState<{ hash: string; text: string } | null>(null);
  const rule = draft?.hash === hash ? draft.text : ruleFromHash(hash) || DEFAULT_RULE;
  const setRule = (text: string) => setDraft({ hash, text });

  const now = useNow();
  const errorId = useId();

  const result = useMemo(() => {
    const trimmed = rule.trim().replace(/^RRULE:/i, "");
    const parts = trimmed ? parseRRule(trimmed) : null;
    if (!parts) {
      const problem = /(^|;)\s*FREQ=/i.test(trimmed)
        ? "One of its parts has a value RFC 5545 does not allow."
        : "Every rule needs a FREQ: DAILY, WEEKLY, MONTHLY or YEARLY.";
      return { parts: null, english: null, problem, dates: [] as Date[] };
    }
    const english = describeRRule(parts);
    if (!now) return { parts, english, problem: null, dates: [] as Date[] };

    const start = new Date(now);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 3);
    const { occurrences } = expandRecurrence(
      {
        id: "preview",
        title: "Occurrence",
        start: start.toISOString(),
        end: new Date(start.getTime() + 30 * 60_000).toISOString(),
        rrule: trimmed,
      },
      { start, end },
      { limit: SLOTS },
    );
    return { parts, english, problem: null, dates: occurrences.map((o) => new Date(o.start)) };
  }, [rule, now]);

  const valid = result.parts !== null;
  const empty = rule.trim().length === 0;
  const invalid = !empty && !valid;

  return (
    <ToolCard>
      <Pane>
        <Field className="items-stretch" invalid={invalid}>
          <FieldLabel>An RFC 5545 recurrence rule</FieldLabel>
          <Input
            size="lg"
            className="font-mono"
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? errorId : undefined}
            value={rule}
            onChange={(e) => setRule(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder="FREQ=WEEKLY;BYDAY=MO,WE,FR"
          />
        </Field>
        <div role="group" aria-label="Examples" className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <Button key={e.rule} size="xs" variant="outline" onClick={() => setRule(e.rule)}>
              {e.label}
            </Button>
          ))}
        </div>
      </Pane>

      <Pane label="in English">
        <div role="status">
          {empty ? (
            <p className="text-lg text-muted-foreground">Paste a rule above.</p>
          ) : valid ? (
            <p className="flex items-start gap-2.5 font-heading text-2xl font-semibold tracking-tight text-balance">
              <Check className="mt-1.5 size-5 shrink-0 text-success" aria-hidden />
              {result.english}
            </p>
          ) : (
            <p id={errorId} className="flex items-start gap-2.5 text-lg text-muted-foreground">
              <AlertCircle className="mt-1 size-5 shrink-0 text-destructive" aria-hidden />
              That does not parse as an RRULE. {result.problem}
            </p>
          )}
        </div>
      </Pane>

      {valid && (
        <>
          <Pane label={occurrencesLabel(result.dates.length, !now)}>
            <Occurrences
              dates={result.dates}
              pending={!now}
              slots={SLOTS}
              empty="The rule parses, but produces nothing in the next three years."
            />
          </Pane>

          <Pane>
            <CodePanes
              panes={[
                {
                  title: "what the parser saw",
                  code: JSON.stringify(result.parts, null, 2),
                  copyLabel: "Copy parsed rule",
                },
              ]}
            />
          </Pane>
        </>
      )}
    </ToolCard>
  );
}
