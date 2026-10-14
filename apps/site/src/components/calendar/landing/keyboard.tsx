"use client";

import { Frame } from "@coss/ui/components/frame";
import { cn } from "@coss/ui/lib/utils";
import { KEY_ACTIONS } from "kloq";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { SegmentedControl, SegmentedControlItem } from "@/components/calendar/ui/segmented-control";

type Mod = "shift" | "alt" | "meta";
type Layer = "" | "shift" | "alt" | "meta" | "shift+meta" | "alt+shift" | "alt+shift+meta";

/** `code` is `KeyboardEvent.code`; `u` is the width in key units; `mod` makes it a layer toggle. */
type KeyDef = { code: string; cap: string; u?: number; mod?: Mod };

const letters = (s: string): KeyDef[] =>
  [...s].map((c) => ({ code: `Key${c.toUpperCase()}`, cap: c }));
const digits = (s: string): KeyDef[] => [...s].map((c) => ({ code: `Digit${c}`, cap: c }));

const ROWS: KeyDef[][] = [
  [
    { code: "Escape", cap: "esc", u: 1.5 },
    ...digits("1234567890"),
    { code: "Minus", cap: "-" },
    { code: "Equal", cap: "=" },
    { code: "Backspace", cap: "⌫", u: 1.5 },
  ],
  [
    { code: "Tab", cap: "⇥", u: 1.5 },
    ...letters("qwertyuiop"),
    { code: "BracketLeft", cap: "[" },
    { code: "BracketRight", cap: "]" },
    { code: "Backslash", cap: "\\", u: 1.5 },
  ],
  [
    { code: "CapsLock", cap: "⇪", u: 2 },
    ...letters("asdfghjkl"),
    { code: "Semicolon", cap: ";" },
    { code: "Quote", cap: "'" },
    { code: "Enter", cap: "↵", u: 2 },
  ],
  [
    { code: "ShiftLeft", cap: "⇧", u: 2.5, mod: "shift" },
    ...letters("zxcvbnm"),
    { code: "Comma", cap: "," },
    { code: "Period", cap: "." },
    { code: "Slash", cap: "/" },
    { code: "ShiftRight", cap: "⇧", u: 2.5, mod: "shift" },
  ],
  [
    { code: "Fn", cap: "fn" },
    { code: "ControlLeft", cap: "⌃" },
    { code: "AltLeft", cap: "⌥", mod: "alt" },
    { code: "MetaLeft", cap: "⌘", u: 1.25, mod: "meta" },
    { code: "Space", cap: "", u: 5.5 },
    { code: "MetaRight", cap: "⌘", u: 1.25, mod: "meta" },
    { code: "AltRight", cap: "⌥", mod: "alt" },
    { code: "ArrowLeft", cap: "←" },
    { code: "ArrowUpDown", cap: "↕" },
    { code: "ArrowRight", cap: "→" },
  ],
];

/* The base layer's mnemonics come from the package's own table, so a rebind there shows here. */
const SHORT: Record<string, string> = {
  today: "today",
  "view-day": "day",
  "view-3days": "3-day",
  "view-week": "week",
  "view-month": "month",
  "view-year": "year",
  "view-agenda": "agenda",
  create: "create",
  shortcuts: "? sheet",
};
const codeOf = (key: string) =>
  /^[a-z]$/.test(key)
    ? `Key${key.toUpperCase()}`
    : /^\d$/.test(key)
      ? `Digit${key}`
      : key === "?"
        ? "Slash"
        : null;

const base: Record<string, string> = {};
const shifted: Record<string, string> = {};
for (const a of KEY_ACTIONS) {
  const code = a.defaultKey && codeOf(a.defaultKey);
  if (!code) continue;
  (a.defaultKey === "?" ? shifted : base)[code] = SHORT[a.id] ?? a.label;
}

const BIND: Record<Layer, Record<string, string>> = {
  "": {
    ...base,
    Digit1: "recolor",
    Digit2: "recolor",
    Digit4: "recolor",
    Digit5: "recolor",
    Enter: "open",
    Escape: "cancel",
    Backspace: "delete",
    ArrowLeft: "prev",
    ArrowRight: "next",
    ArrowUpDown: "walk",
  },
  shift: { ...shifted, ArrowLeft: "extend", ArrowRight: "extend", ArrowUpDown: "extend" },
  meta: {
    KeyK: "palette",
    KeyZ: "undo",
    KeyA: "select all",
    KeyC: "copy",
    KeyX: "cut",
    KeyV: "paste",
    KeyD: "duplicate",
    Enter: "save",
  },
  "shift+meta": {
    KeyZ: "redo",
    KeyE: "export .ics",
    Comma: "zoom out",
    Period: "zoom in",
    Digit0: "reset zoom",
  },
  alt: { KeyD: "design", ArrowLeft: "nudge", ArrowRight: "nudge", ArrowUpDown: "nudge" },
  "alt+shift": { ArrowUpDown: "grow · end" },
  "alt+shift+meta": { ArrowUpDown: "grow · start" },
};

const LAYERS: { id: Layer; label: string }[] = [
  { id: "", label: "none" },
  { id: "shift", label: "⇧" },
  { id: "alt", label: "⌥" },
  { id: "meta", label: "⌘" },
  { id: "shift+meta", label: "⇧⌘" },
  { id: "alt+shift", label: "⌥⇧" },
  { id: "alt+shift+meta", label: "⌥⇧⌘" },
];

/* The `?` sheet's rows, by layer — the accessible half of the keyboard. */
const LEGEND: Record<Layer, [string, string][]> = {
  "": [
    ...KEY_ACTIONS.filter((a) => a.defaultKey && a.defaultKey !== "?").map(
      (a) => [a.defaultKey as string, a.label] as [string, string],
    ),
    ["1 – 5", "Recolor the selected event"],
    ["↵", "Open the selected event"],
    ["esc", "Close the panel, then clear the selection / cancel a drag"],
    ["⌫", "Delete the selection"],
    ["← →", "Previous / next range — or walk the selection"],
    ["↑ ↓", "Walk selection between events"],
  ],
  shift: [
    ["⇧ /", "Keyboard shortcuts sheet"],
    ["⇧ arrows", "Extend the selection as the arrows walk"],
    ["⇧ click", "Extend the selection to this event"],
  ],
  meta: [
    ["⌘ K", "Command menu — every action, grouped"],
    ["⌘ Z", "Undo"],
    ["⌘ A", "Select all visible events"],
    ["⌘ C", "Copy the selection (.ics + text)"],
    ["⌘ X", "Cut the selection"],
    ["⌘ V", "Paste at the hovered slot"],
    ["⌘ D", "Duplicate in place"],
    ["⌘ ↵", "Save the open panel"],
    ["⌘ drag", "Marquee-select"],
  ],
  "shift+meta": [
    ["⇧ ⌘ Z", "Redo"],
    ["⇧ ⌘ E", "Export the selected event as .ics"],
    ["⇧ ⌘ , .", "Zoom hours out / in"],
    ["⇧ ⌘ 0", "Default hour size"],
  ],
  alt: [
    ["⌥ D", "Design mode"],
    ["⌥ arrows", "Nudge the selected event"],
    ["⌥ drag", "Move → duplicate (the ghost solidifies)"],
    ["⌥", "Create / resize on a 5-minute snap"],
  ],
  "alt+shift": [["⌥ ⇧ ↑↓", "Grow / shrink from the end"]],
  "alt+shift+meta": [["⌥ ⇧ ⌘ ↑↓", "Grow / shrink from the start"]],
};

const MOD_OF: Record<string, Mod> = { Shift: "shift", Alt: "alt", Meta: "meta" };
const ORDER: Mod[] = ["alt", "shift", "meta"];
const layerOf = (mods: Set<Mod>): Layer => {
  const key = ORDER.filter((m) => mods.has(m)).join("+") as Layer;
  return key in BIND ? key : ""; // unsupported combos (⌃, ⌥⌘…) fall back to the bare layer
};
const modsOf = (layer: Layer) => new Set(layer ? (layer.split("+") as Mod[]) : []);

const editable = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export function Keyboard() {
  const [sticky, setSticky] = useState<Set<Mod>>(() => new Set());
  const [held, setHeld] = useState<Set<Mod>>(() => new Set());
  const [pressed, setPressed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (editable(e.target)) return;
      const mod = MOD_OF[e.key];
      if (mod) setHeld((h) => new Set(h).add(mod));
      setPressed((p) => new Set(p).add(e.code));
    };
    const up = (e: KeyboardEvent) => {
      const mod = MOD_OF[e.key];
      if (mod)
        setHeld((h) => {
          const n = new Set(h);
          n.delete(mod);
          return n;
        });
      // ⌘ swallows the keyup of whatever was pressed with it; release everything
      setPressed((p) => {
        if (mod === "meta") return new Set();
        const n = new Set(p);
        n.delete(e.code);
        return n;
      });
    };
    const clear = () => {
      setHeld(new Set());
      setPressed(new Set());
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, []);

  const active = useMemo(() => new Set<Mod>([...sticky, ...held]), [sticky, held]);
  const layer = layerOf(active);
  const bind = BIND[layer];
  const toggle = (m: Mod) =>
    setSticky((s) => {
      const n = new Set(s);
      if (n.has(m)) n.delete(m);
      else n.add(m);
      return n;
    });

  return (
    <div className="flex flex-col gap-5">
      {/* a keyboard has a width: on a phone it scrolls rather than shrinking past legibility */}
      <div
        role="group"
        tabIndex={0}
        aria-label="A keyboard showing which keys are bound in the selected modifier layer"
        className="-mx-6 overflow-x-auto px-6 py-1 sm:mx-0 sm:px-0"
      >
        <Frame className="min-w-176 gap-1.5 p-3 select-none">
          {ROWS.map((row, r) => (
            <div key={r} className="flex gap-1.5">
              {row.map((k) => {
                const label = bind[k.code];
                const isMod = !!k.mod;
                const on = isMod ? active.has(k.mod!) : !!label;
                const down = pressed.has(k.code) || (isMod && held.has(k.mod!));
                const cls = cn(
                  "flex h-14 min-w-0 flex-col items-center justify-center rounded-md border border-b-2 text-sm leading-none transition duration-100",
                  on
                    ? "border-foreground bg-foreground text-background"
                    : "bg-card text-muted-foreground",
                  isMod && on && "ring-2 ring-brand ring-offset-1 ring-offset-background",
                  down && "translate-y-px border-b",
                );
                const style = { flex: `${k.u ?? 1} ${k.u ?? 1} 0%` } as CSSProperties;
                const body =
                  k.code === "ArrowUpDown" ? (
                    <span className={cn(label && "-translate-y-1")}>↕</span>
                  ) : (
                    <span className={cn(label && "-translate-y-1")}>
                      {k.cap.length === 1 ? k.cap.toUpperCase() : k.cap}
                    </span>
                  );
                return isMod ? (
                  <button
                    key={k.code}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${k.cap} layer`}
                    onClick={() => toggle(k.mod!)}
                    style={style}
                    className={cn(
                      cls,
                      "cursor-pointer text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    )}
                  >
                    {body}
                  </button>
                ) : (
                  <span key={k.code} style={style} className={cls} title={label}>
                    {body}
                    {label && (
                      <span className="mt-1 max-w-full truncate text-3xs font-medium">{label}</span>
                    )}
                  </span>
                );
              })}
            </div>
          ))}
        </Frame>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span id="keyboard-layer" className="font-mono text-xs text-muted-foreground">
          layer
        </span>
        <SegmentedControl
          size="sm"
          aria-labelledby="keyboard-layer"
          value={layer}
          onValueChange={(next) => setSticky(modsOf(next as Layer))}
        >
          {LAYERS.map((l) => (
            <SegmentedControlItem
              key={l.id}
              value={l.id}
              aria-label={l.id ? `${l.label} layer` : "No modifier"}
            >
              {l.label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        <span className="font-mono text-xs text-muted-foreground max-sm:hidden">
          or hold the real one
        </span>
      </div>

      <ul aria-label="Bindings" className="grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
        {LEGEND[layer].map(([keys, label]) => (
          <li key={keys + label} className="flex items-baseline gap-3">
            <span className="w-20 shrink-0 text-foreground">{keys}</span>
            <span className="text-muted-foreground">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
