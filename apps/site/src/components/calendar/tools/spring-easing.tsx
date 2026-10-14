"use client";

import { Button } from "@coss/ui/components/button";
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Slider, SliderValue } from "@coss/ui/components/slider";
import { springLinear, springSamples } from "kloq";
import { Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CodePanes } from "@/components/calendar/site/code-panes";
import { Label } from "@/components/calendar/ui/label";
import { Pane, PaneStack, TOOL_SPLIT, ToolCard } from "./tool-parts";

const PRESETS = [
  { name: "Drag settle", stiffness: 380, damping: 30 },
  { name: "Resize", stiffness: 300, damping: 19 },
  { name: "Keyboard", stiffness: 700, damping: 36 },
  { name: "Loose", stiffness: 140, damping: 12 },
] as const;

function Knob({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <Field className="items-stretch">
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      >
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <FieldLabel>{label}</FieldLabel>
          <SliderValue className="font-mono text-xs tabular-nums" />
        </div>
      </Slider>
    </Field>
  );
}

export function SpringEasing() {
  const [stiffness, setStiffness] = useState(380);
  const [damping, setDamping] = useState(30);
  const [samples, setSamples] = useState(40);
  const [duration, setDuration] = useState(420);
  const blockRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const easing = useMemo(
    () => springLinear(stiffness, damping, samples),
    [stiffness, damping, samples],
  );
  const points = useMemo(() => springSamples(stiffness, damping), [stiffness, damping]);
  const peak = Math.max(...points);

  const run = () => {
    const el = blockRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    el.getAnimations().forEach((a) => a.cancel());
    /* measured in px (WAAPI keyframes do not substitute custom properties), and scaled so the
       overshoot lands inside the track instead of past its edge */
    const distance = (track.clientWidth - el.offsetWidth) / Math.max(1, peak);
    if (distance <= 0) return;
    el.animate([{ transform: "translateX(0px)" }, { transform: `translateX(${distance}px)` }], {
      duration,
      easing,
      fill: "none",
    });
  };

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [easing, duration]);

  const yScale = Math.max(1.35, peak);
  const y = (p: number) => 100 - (p / yScale) * 100;
  const path = points.map((p, i) => `${(i / (points.length - 1)) * 100},${y(p)}`).join(" ");
  const settled = y(1);
  const overshoot = `${(Math.max(0, peak - 1) * 100).toFixed(1)}%`;

  return (
    <ToolCard className={TOOL_SPLIT}>
      <Pane className="flex flex-col gap-6">
        <Knob label="Stiffness" value={stiffness} min={40} max={800} onChange={setStiffness} />
        <Knob label="Damping" value={damping} min={6} max={80} onChange={setDamping} />
        <Knob label="Samples" value={samples} min={8} max={120} onChange={setSamples} />
        <Knob
          label="Duration (ms)"
          value={duration}
          min={120}
          max={1400}
          step={10}
          onChange={setDuration}
        />

        <div className="flex flex-col gap-2">
          <Label id="spring-presets" render={<span />}>
            Presets
          </Label>
          <div
            role="group"
            aria-labelledby="spring-presets"
            className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
          >
            {PRESETS.map((p) => (
              <Button
                key={p.name}
                size="xs"
                variant="outline"
                onClick={() => {
                  setStiffness(p.stiffness);
                  setDamping(p.damping);
                }}
              >
                {p.name}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            The first three are the springs coss calendar actually ships.
          </p>
        </div>
      </Pane>

      <PaneStack>
        <Pane
          label="the sampled curve"
          action={
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              overshoot {overshoot}
            </span>
          }
        >
          <svg
            viewBox="-2 -6 104 112"
            preserveAspectRatio="none"
            className="h-40 w-full"
            role="img"
            aria-label={`Spring curve at stiffness ${stiffness}, damping ${damping}: overshoot ${overshoot}`}
          >
            <line
              x1="0"
              y1="100"
              x2="100"
              y2="100"
              vectorEffect="non-scaling-stroke"
              className="stroke-input"
            />
            <line
              x1="0"
              y1={settled}
              x2="100"
              y2={settled}
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
              className="stroke-muted-foreground"
            />
            <polyline
              points={path}
              fill="none"
              strokeWidth="1.5"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="stroke-brand"
            />
          </svg>
          <p
            aria-hidden
            className="mt-1 flex justify-between font-mono text-3xs text-muted-foreground"
          >
            <span>0</span>
            <span>settled — the dashed line is 100%</span>
            <span>1</span>
          </p>
        </Pane>

        <Pane
          label="run it"
          action={
            <Button size="sm" variant="ghost" onClick={run}>
              <Play aria-hidden />
              Replay
            </Button>
          }
        >
          <div className="rounded-lg border bg-background p-4">
            <div ref={trackRef}>
              <div ref={blockRef} className="h-10 w-14 rounded-md bg-brand" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Driven through WAAPI with the value below — no library, no per-frame JavaScript.
          </p>
        </Pane>

        <Pane>
          <CodePanes
            panes={[{ title: "paste this", code: easing, copyLabel: "Copy easing", wrap: true }]}
          />
        </Pane>
      </PaneStack>
    </ToolCard>
  );
}
