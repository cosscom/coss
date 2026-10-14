"use client";

import { Button } from "@coss/ui/components/button";
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@coss/ui/components/number-field";
import { Skeleton } from "@coss/ui/components/skeleton";
import {
  describeRRule,
  expandRecurrence,
  parseRRule,
  presetsFor,
  type RRuleByDay,
  type RRuleFreq,
  type RRuleParts,
  type RRuleWeekday,
  serializeRRule,
  withEnd,
} from "kloq";
import Link from "next/link";
import { type ReactNode, useId, useMemo, useState } from "react";
import { CodePanes } from "@/components/calendar/site/code-panes";
import { Label } from "@/components/calendar/ui/label";
import { SegmentedControl, SegmentedControlItem } from "@/components/calendar/ui/segmented-control";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/calendar/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/calendar/ui/toggle-group";
import { Occurrences, occurrencesLabel, Pane, PaneStack, TOOL_SPLIT, ToolCard } from "./tool-parts";
import { useNow } from "./use-now";

type Option<T> = { value: T; label: string };

const FREQS: (Option<RRuleFreq> & { unit: string })[] = [
  { value: "DAILY", label: "Day", unit: "days" },
  { value: "WEEKLY", label: "Week", unit: "weeks" },
  { value: "MONTHLY", label: "Month", unit: "months" },
  { value: "YEARLY", label: "Year", unit: "years" },
];

const WEEKDAYS: Option<RRuleWeekday>[] = [
  { value: "MO", label: "Monday" },
  { value: "TU", label: "Tuesday" },
  { value: "WE", label: "Wednesday" },
  { value: "TH", label: "Thursday" },
  { value: "FR", label: "Friday" },
  { value: "SA", label: "Saturday" },
  { value: "SU", label: "Sunday" },
];

const MONTHS: Option<number>[] = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
].map((label, i) => ({ value: i + 1, label }));

const ORDINALS: Option<number>[] = [
  { value: 1, label: "First" },
  { value: 2, label: "Second" },
  { value: 3, label: "Third" },
  { value: 4, label: "Fourth" },
  { value: 5, label: "Fifth" },
  { value: -1, label: "Last" },
];

type MonthlyMode = "day-of-month" | "nth-weekday";
type EndMode = "never" | "count" | "until";

const MONTHLY_MODES: Option<MonthlyMode>[] = [
  { value: "day-of-month", label: "Date" },
  { value: "nth-weekday", label: "Weekday" },
];

const END_MODES: Option<EndMode>[] = [
  { value: "never", label: "Never" },
  { value: "count", label: "After N" },
  { value: "until", label: "On date" },
];

const SLOTS = 6;
const pad = (n: number) => String(n).padStart(2, "0");

/* the whole number in 1…max a rule can carry; an emptied field counts as 1 */
const whole = (value: number | null, max: number) =>
  Math.min(max, Math.max(1, Math.round(value ?? 1)));

function Choice<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
}) {
  const id = useId();
  return (
    <div className="@container flex flex-col gap-2">
      <Label id={id} render={<span />}>
        {label}
      </Label>
      <SegmentedControl
        fill
        size="sm"
        aria-labelledby={id}
        className={options.length > 3 ? "@max-3xs:grid @max-3xs:grid-cols-2" : undefined}
        value={value}
        onValueChange={(v) => onChange(v as T)}
      >
        {options.map((o) => (
          <SegmentedControlItem key={o.value} value={o.value}>
            {o.label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
    </div>
  );
}

function Pick<T extends string | number>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
}) {
  return (
    <Field className="min-w-36 flex-1 items-stretch">
      <FieldLabel>{label}</FieldLabel>
      <Select items={options} value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </Field>
  );
}

/* `null` is a field being retyped; leaving it puts back the number the rule is using */
function Count({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  max: number;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <NumberField
        className="w-32"
        min={1}
        max={max}
        step={1}
        format={{ maximumFractionDigits: 0 }}
        value={value}
        onValueChange={onChange}
        onValueCommitted={(v) => onChange(whole(v, max))}
      >
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
    </Field>
  );
}

function Days({
  value,
  onChange,
}: {
  value: RRuleWeekday[];
  onChange: (v: RRuleWeekday[]) => void;
}) {
  const id = useId();
  return (
    <div className="@container flex flex-col gap-2">
      <Label id={id} render={<span />}>
        On these days
      </Label>
      <ToggleGroup
        multiple
        fill
        variant="outline"
        aria-labelledby={id}
        value={value}
        onValueChange={(next) =>
          onChange(WEEKDAYS.map((d) => d.value).filter((d) => next.includes(d)))
        }
      >
        {WEEKDAYS.map((d) => (
          <ToggleGroupItem key={d.value} value={d.value} aria-label={d.label}>
            {d.label.slice(0, 1)}
            <span className="@max-3xs:hidden">{d.label.slice(1, 2)}</span>
            <span className="@max-xs:hidden">{d.label.slice(2, 3)}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">
          With no days selected the rule falls back to the start date&rsquo;s weekday.
        </p>
      )}
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-xs text-muted-foreground">{children}</p>;
}

export function RRuleBuilder() {
  const [freq, setFreq] = useState<RRuleFreq>("WEEKLY");
  const [every, setEvery] = useState<number | null>(1);
  const [byDay, setByDay] = useState<RRuleWeekday[]>(["MO", "WE", "FR"]);
  const [monthlyMode, setMonthlyMode] = useState<MonthlyMode>("day-of-month");
  const [monthDay, setMonthDay] = useState<number | null>(1);
  const [ordinal, setOrdinal] = useState(1);
  const [nthWeekday, setNthWeekday] = useState<RRuleWeekday>("MO");
  const [byMonth, setByMonth] = useState(1);
  const [endMode, setEndMode] = useState<EndMode>("never");
  const [count, setCount] = useState<number | null>(10);
  const [untilDraft, setUntilDraft] = useState<string | null>(null);

  const now = useNow();
  const until =
    untilDraft ??
    (now ? `${now.getFullYear() + 1}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` : "");

  const rule = useMemo(() => {
    let parts: RRuleParts = { freq };
    if (whole(every, 99) > 1) parts.interval = whole(every, 99);

    if (freq === "WEEKLY" && byDay.length) {
      parts.byDay = byDay.map((weekday): RRuleByDay => ({ weekday }));
    }
    if (freq === "MONTHLY") {
      if (monthlyMode === "day-of-month") parts.byMonthDay = [whole(monthDay, 31)];
      else parts.byDay = [{ weekday: nthWeekday, ordinal }];
    }
    if (freq === "YEARLY") {
      parts.byMonth = [byMonth];
      parts.byMonthDay = [whole(monthDay, 31)];
    }

    if (endMode === "count") {
      parts = withEnd(parts, { type: "count", count: whole(count, 999) });
    } else if (endMode === "until") {
      const [y, m, d] = until.split("-").map(Number);
      if (y && m && d)
        parts = withEnd(parts, { type: "until", until: { year: y, month: m, day: d } });
    }
    return { text: serializeRRule(parts), english: describeRRule(parts) };
  }, [
    freq,
    every,
    byDay,
    monthlyMode,
    monthDay,
    ordinal,
    nthWeekday,
    byMonth,
    endMode,
    count,
    until,
  ]);

  const dates = useMemo(() => {
    if (!now) return [];
    const start = new Date(now);
    start.setHours(9, 0, 0, 0);
    const horizon = new Date(start);
    horizon.setFullYear(horizon.getFullYear() + 5);
    const { occurrences } = expandRecurrence(
      {
        id: "preview",
        title: "Occurrence",
        start: start.toISOString(),
        end: new Date(start.getTime() + 30 * 60_000).toISOString(),
        rrule: rule.text,
      },
      { start, end: horizon },
      { limit: SLOTS },
    );
    return occurrences.map((o) => new Date(o.start));
  }, [rule.text, now]);

  const presets = useMemo(() => (now ? presetsFor(now).filter((p) => p.rule) : null), [now]);

  const load = (text: string) => {
    const parts = parseRRule(text);
    if (!parts) return;
    setFreq(parts.freq);
    setEvery(parts.interval ?? 1);
    const nth = parts.byDay?.find((d) => d.ordinal);
    if (parts.freq === "WEEKLY") setByDay(parts.byDay?.map((d) => d.weekday) ?? []);
    if (parts.freq === "MONTHLY") {
      setMonthlyMode(nth ? "nth-weekday" : "day-of-month");
      if (nth) {
        setOrdinal(nth.ordinal ?? 1);
        setNthWeekday(nth.weekday);
      } else setMonthDay(parts.byMonthDay?.[0] ?? 1);
    }
    if (parts.freq === "YEARLY") {
      setByMonth(parts.byMonth?.[0] ?? 1);
      setMonthDay(parts.byMonthDay?.[0] ?? 1);
    }
    setEndMode(parts.count ? "count" : parts.until ? "until" : "never");
    if (parts.count) setCount(parts.count);
    if (parts.until)
      setUntilDraft(`${parts.until.year}-${pad(parts.until.month)}-${pad(parts.until.day)}`);
  };

  const unit = FREQS.find((f) => f.value === freq)!.unit;
  const day = whole(monthDay, 31);
  const ended =
    endMode === "until" && now !== null && until !== "" && new Date(`${until}T23:59:59`) < now;
  const nothing = ended
    ? "The end date has already passed, so there is nothing left to list."
    : freq === "YEARLY" && day > 28
      ? `No year in the next five has a ${day} ${MONTHS[byMonth - 1].label}.`
      : "This rule produces nothing in the next five years.";

  return (
    <ToolCard className={TOOL_SPLIT}>
      <Pane className="flex flex-col gap-6">
        <Choice label="Repeats every" value={freq} onChange={setFreq} options={FREQS} />
        <Count label={`Every N ${unit}`} value={every} onChange={setEvery} max={99} />

        {freq === "WEEKLY" && <Days value={byDay} onChange={setByDay} />}

        {freq === "MONTHLY" && (
          <>
            <Choice
              label="By"
              value={monthlyMode}
              onChange={setMonthlyMode}
              options={MONTHLY_MODES}
            />
            {monthlyMode === "day-of-month" ? (
              <Count label="Day" value={monthDay} onChange={setMonthDay} max={31} />
            ) : (
              <div className="flex flex-wrap gap-3">
                <Pick label="Which" value={ordinal} onChange={setOrdinal} options={ORDINALS} />
                <Pick
                  label="Weekday"
                  value={nthWeekday}
                  onChange={setNthWeekday}
                  options={WEEKDAYS}
                />
              </div>
            )}
          </>
        )}

        {freq === "YEARLY" && (
          <div className="flex flex-wrap items-start gap-3">
            <Pick label="Month" value={byMonth} onChange={setByMonth} options={MONTHS} />
            <Count label="Day" value={monthDay} onChange={setMonthDay} max={31} />
          </div>
        )}

        <Choice label="Ends" value={endMode} onChange={setEndMode} options={END_MODES} />
        {endMode === "count" && (
          <Count label="Occurrences" value={count} onChange={setCount} max={999} />
        )}
        {endMode === "until" && (
          <Field>
            <FieldLabel>Last date</FieldLabel>
            <Input
              type="date"
              className="w-44"
              value={until}
              onChange={(e) => setUntilDraft(e.target.value)}
            />
          </Field>
        )}
      </Pane>

      <PaneStack>
        <Pane>
          <CodePanes
            panes={[{ title: "your rule", code: rule.text, copyLabel: "Copy rule", wrap: true }]}
          />
          <p
            role="status"
            className="mt-4 font-heading text-xl font-semibold tracking-tight text-balance"
          >
            {rule.english}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Written by <code>serializeRRule()</code>, then read back by <code>describeRRule()</code>{" "}
            — the sentence comes from the rule, not from the form.
          </p>
        </Pane>

        <Pane label={occurrencesLabel(dates.length, !now)}>
          <Occurrences dates={dates} pending={!now} slots={SLOTS} empty={nothing} />
        </Pane>

        <Pane label="start from a preset">
          <div className="flex flex-wrap gap-2">
            {presets
              ? presets.map((p) => (
                  <Button key={p.id} size="xs" variant="outline" onClick={() => load(p.rule!)}>
                    {p.label}
                  </Button>
                ))
              : Array.from({ length: SLOTS }, (_, i) => (
                  <Skeleton key={i} className="h-7 w-28 rounded-md sm:h-6" />
                ))}
          </div>
          <Note>
            The presets coss calendar&rsquo;s own recurrence menu offers, from{" "}
            <code>presetsFor()</code>; picking one sets the controls. Already have a rule?{" "}
            <Link
              href="/calendar/tools/rrule"
              className="rounded-xs text-foreground underline underline-offset-4"
            >
              Explain it instead
            </Link>
            .
          </Note>
        </Pane>
      </PaneStack>
    </ToolCard>
  );
}
