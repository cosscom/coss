"use client";

import { Button } from "@coss/ui/components/button";
import { Slider } from "@coss/ui/components/slider";
import { Switch } from "@coss/ui/components/switch";
import type { KloqProps } from "kloq";
import { RotateCcw } from "lucide-react";
import { type CSSProperties, Fragment, useMemo, useState } from "react";
import { Label } from "@/components/calendar/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/calendar/ui/select";
import { type KloqPropDef, type KnobValue, propsNamed } from "./kloq-props";
import { CodeBlock } from "./ui/code-block";
import { Dot, Live, LiveFrame, StatusBar, StatusText } from "./ui/live-frame";
import { LiveKloq } from "./ui/live-kloq";
import type { SnippetPalette, SnippetTokenKind } from "./ui/snippet-palette";
import { inline } from "./ui/type-table";

/** "" is the playground's "prop unset" marker — dropped before the spread and left out of the snippet. */
const UNSET = "";

type Token = [text: string, kind?: SnippetTokenKind];

const literal = (v: string | number | boolean): Token =>
  typeof v === "string" ? [`"${v}"`, "string"] : [String(v), "value"];

function valueTokens(value: KnobValue): Token[] {
  if (typeof value === "string") return [literal(value)];
  if (typeof value === "number" || typeof value === "boolean")
    return [["{"], literal(value), ["}"]];
  if (Array.isArray(value))
    return [
      ["{["],
      ...value.flatMap((v, i): Token[] => (i ? [[", "], literal(v)] : [literal(v)])),
      ["]}"],
    ];
  return [
    ["{{ "],
    ...Object.entries(value).flatMap(([k, v], i): Token[] => [
      [`${i ? ", " : ""}${k}: `],
      literal(v),
    ]),
    [" }}"],
  ];
}

/** One token list per line. Only what you changed: a prop at its default is noise in a snippet meant to be copied. */
function snippetLines(
  values: Record<string, KnobValue>,
  props: KloqPropDef[],
  toolbar: boolean,
): Token[][] {
  const attrs = props
    .filter(
      (p) =>
        values[p.name] !== UNSET &&
        JSON.stringify(values[p.name]) !== JSON.stringify(p.knob!.defaultValue),
    )
    .map((p): Token[] => {
      const v = values[p.name];
      return v === true
        ? [["  "], [p.name, "attr"]]
        : [["  "], [p.name, "attr"], ["=", "op"], ...valueTokens(v)];
    });
  const open: Token[] = [["<"], ["Kloq", "tag"]];
  const tail: Token[][] = toolbar
    ? [
        [["  <"], ["Kloq.Toolbar", "tag"], [" />"]],
        [["</"], ["Kloq", "tag"], [">"]],
      ]
    : [];
  if (attrs.length === 0) return toolbar ? [[...open, [">"]], ...tail] : [[...open, [" />"]]];
  return [open, ...attrs, [[toolbar ? ">" : "/>"]], ...tail];
}

/* The snippet's grammar is closed, so it is tokenised here instead of shipping a highlighter;
   `palette` carries the colours the server-side highlighter gives the same tokens. */
function Snippet({ lines, palette }: { lines: Token[][]; palette: SnippetPalette }) {
  return (
    <CodeBlock flush title="calendar.tsx" className="shiki">
      <code>
        {lines.map((line, i) => (
          <Fragment key={i}>
            {i > 0 && "\n"}
            <span className="line">
              {line.map(([text, kind], j) => {
                const color = kind && palette[kind];
                return (
                  <span
                    key={j}
                    style={
                      color &&
                      ({ "--shiki-light": color[0], "--shiki-dark": color[1] } as CSSProperties)
                    }
                  >
                    {text}
                  </span>
                );
              })}
            </span>
          </Fragment>
        ))}
      </code>
    </CodeBlock>
  );
}

function KnobControl({
  prop,
  value,
  onChange,
}: {
  prop: KloqPropDef;
  value: KnobValue;
  onChange: (value: KnobValue) => void;
}) {
  const knob = prop.knob!;
  const name = <span className="font-mono text-xs text-foreground">{prop.name}</span>;
  const help = (
    <span className="text-xs leading-snug text-muted-foreground">{inline(prop.description)}</span>
  );
  if (knob.kind === "boolean") {
    return (
      <Label className="flex cursor-pointer flex-col items-stretch gap-1.5 py-3 font-normal">
        <span className="flex items-center justify-between gap-3">
          {name}
          <Switch checked={value === true} onCheckedChange={(on) => onChange(on === true)} />
        </span>
        {help}
      </Label>
    );
  }
  if (knob.kind === "number") {
    return (
      <div className="flex flex-col gap-2 py-3">
        <div className="flex items-center justify-between gap-3">
          {name}
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {String(value)}
          </span>
        </div>
        <Slider
          value={typeof value === "number" ? value : knob.defaultValue}
          min={knob.min}
          max={knob.max}
          step={knob.step ?? 1}
          onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
          aria-label={prop.name}
        />
        {help}
      </div>
    );
  }
  const selected = knob.options.findIndex((o) => JSON.stringify(o.value) === JSON.stringify(value));
  const items = knob.options.map((o, i) => ({ label: o.label, value: String(i) }));
  return (
    <div className="flex flex-col gap-1.5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        {name}
        <Select
          items={items}
          value={String(Math.max(selected, 0))}
          onValueChange={(v) => {
            const option = knob.options[Number(v)];
            if (option) onChange(option.value);
          }}
        >
          <SelectTrigger size="xs" className="w-40 shrink-0 font-mono" aria-label={prop.name}>
            <SelectValue />
          </SelectTrigger>
          <SelectPopup size="xs">
            {items.map((it) => (
              <SelectItem key={it.value} value={it.value} className="font-mono">
                {it.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </div>
      {help}
    </div>
  );
}

/**
 * A live <Kloq> beside a knob panel, with a snippet that rewrites itself.
 * `knobs` names props from the catalog; omit it for every knobbed prop.
 * The calendar does not collapse on its own here unless the `responsive` switch is on: it draws the
 * view the knob names at every width.
 */
export function Playground({
  knobs,
  toolbar = false,
  height = "30rem",
  palette,
  className,
}: {
  /** from `snippetPalette()` on the server */
  palette: SnippetPalette;
  knobs?: string[];
  toolbar?: boolean;
  height?: string;
  className?: string;
}) {
  const props = useMemo(() => propsNamed(knobs), [knobs]);
  const defaults = useMemo(
    () => Object.fromEntries(props.map((p) => [p.name, p.knob!.defaultValue])),
    [props],
  );
  const [values, setValues] = useState<Record<string, KnobValue>>(defaults);
  const [responsive, setResponsive] = useState(false);
  const live = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== UNSET));
  /* `default*` props are read once, so a new value has to mount a new calendar to show */
  const initialKey = JSON.stringify(
    props.filter((p) => p.name.startsWith("default")).map((p) => values[p.name]),
  );
  const dirty = props.some(
    (p) => JSON.stringify(values[p.name]) !== JSON.stringify(p.knob!.defaultValue),
  );

  return (
    <LiveFrame data-playground className={className}>
      <StatusBar>
        <StatusText>
          <Live />
          <Dot />
          <span>playground</span>
          <Dot />
          <span>nothing is saved</span>
        </StatusText>
        <StatusText className="max-sm:hidden">flip a knob, copy the snippet</StatusText>
      </StatusBar>
      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div
          className="min-w-0 border-b bg-background lg:border-b-0 lg:border-e"
          style={{ height }}
        >
          <LiveKloq
            key={initialKey}
            persistence={false}
            designMode={{ hint: false }}
            responsive={responsive}
            {...(live as unknown as Partial<KloqProps>)}
            toolbar={toolbar}
          />
        </div>
        <div
          data-playground-knobs
          className="flex min-h-0 min-w-0 flex-col lg:max-h-(--knobs-max) lg:overflow-y-auto"
          style={{ "--knobs-max": height } as CSSProperties}
        >
          <div className="sticky top-0 z-10 flex h-9 shrink-0 items-center justify-between border-b bg-card ps-4 pe-2 font-mono text-xs text-muted-foreground">
            <span>props</span>
            <Button
              variant="ghost"
              size="xs"
              disabled={!dirty}
              onClick={() => setValues(defaults)}
              className="font-mono"
            >
              <RotateCcw aria-hidden /> Reset props
            </Button>
          </div>
          <div className="flex flex-col divide-y px-4">
            <Label className="flex cursor-pointer flex-col items-stretch gap-1.5 py-3 font-normal">
              <span className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-foreground">responsive</span>
                <Switch checked={responsive} onCheckedChange={(on) => setResponsive(on === true)} />
              </span>
              <span className="text-xs leading-snug text-muted-foreground">
                Let the calendar collapse to fit this pane, as it does by default. Off here, so
                every view draws at any width; it is a playground setting and never part of the
                snippet.
              </span>
            </Label>
            {props.map((p) => (
              <KnobControl
                key={p.name}
                prop={p}
                value={values[p.name]}
                onChange={(v) => setValues((s) => ({ ...s, [p.name]: v }))}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="border-t">
        <Snippet lines={snippetLines(values, props, toolbar)} palette={palette} />
      </div>
    </LiveFrame>
  );
}
