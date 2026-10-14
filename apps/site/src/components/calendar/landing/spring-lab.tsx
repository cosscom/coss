"use client";

import { Button } from "@coss/ui/components/button";
import { Card, CardDescription, CardTitle } from "@coss/ui/components/card";
import { MOTION_DEFAULTS, type SpringSpec, springLinear, springSamples } from "kloq";
import { Play } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { MiniEvent, type MiniEventColor } from "./mini-event";

const SPRINGS: {
  id: string;
  name: string;
  spec: SpringSpec;
  color: MiniEventColor;
  what: string;
}[] = [
  {
    id: "drag",
    name: "Drag settle",
    spec: MOTION_DEFAULTS.drag,
    color: "violet",
    what: "Let go of a block and it lands. No overshoot, no lerp.",
  },
  {
    id: "resize",
    name: "Resize overshoot",
    spec: MOTION_DEFAULTS.resize,
    color: "blue",
    what: "An edge released stretches a hair past the slot and comes back.",
  },
  {
    id: "keyboard",
    name: "Keyboard nudge",
    spec: MOTION_DEFAULTS.keyboard,
    color: "emerald",
    what: "⌥↑ moves a block fifteen minutes. Stiff, quick, done.",
  },
];

const W = 320;
const H = 112;
const PAD = 10;

const reducedMotion = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function SpringCard({ name, spec, color, what }: (typeof SPRINGS)[number]) {
  const samples = useMemo(() => springSamples(spec.stiffness, spec.damping), [spec]);
  const { d, targetY } = useMemo(() => {
    const max = Math.max(1, ...samples);
    const top = PAD + 6;
    const x = (i: number) => PAD + (i / Math.max(1, samples.length - 1)) * (W - PAD * 2);
    const y = (v: number) => H - PAD - (v / max) * (H - PAD - top);
    return {
      d: samples.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" "),
      targetY: y(1),
    };
  }, [samples]);

  const block = useRef<HTMLDivElement>(null);
  const sweep = useRef<SVGLineElement>(null);
  const root = useRef<HTMLDivElement>(null);

  const play = () => {
    // reduced motion: no travel, the block and the sweep line just blink to their end state
    if (reducedMotion()) {
      const blink = [{ opacity: 0.2 }, { opacity: 1 }];
      block.current?.animate(blink, { duration: 240, easing: "linear" });
      sweep.current?.animate(blink, { duration: 240, easing: "linear" });
      return;
    }
    block.current?.animate([{ translate: "0 -40px" }, { translate: "0 0" }], {
      duration: spec.ms,
      easing: springLinear(spec.stiffness, spec.damping),
      fill: "both",
    });
    sweep.current?.animate(
      [{ transform: `translateX(${PAD}px)` }, { transform: `translateX(${W - PAD}px)` }],
      {
        duration: spec.ms,
        easing: "linear",
        fill: "both",
      },
    );
  };

  useEffect(() => {
    const el = root.current;
    if (!el || reducedMotion()) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        play();
        io.disconnect();
      },
      { threshold: 0.7 },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card ref={root} data-spring-card onPointerEnter={play} className="gap-1 p-5">
      <div className="flex items-center justify-between gap-3">
        <CardTitle render={<h3 />}>{name}</CardTitle>
        <Button size="xs" variant="outline" aria-label={`Play the ${name} spring`} onClick={play}>
          <Play aria-hidden />
          Play
        </Button>
      </div>
      <CardDescription>{what}</CardDescription>
      <p className="font-mono text-xs text-muted-foreground tabular-nums">
        k {spec.stiffness} · c {spec.damping} · {spec.ms} ms
      </p>

      <div aria-hidden className="mt-auto grid grid-cols-[1fr_5.5rem] gap-3 pt-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible text-foreground">
          <line
            x1={PAD}
            x2={W - PAD}
            y1={targetY}
            y2={targetY}
            className="stroke-border"
            strokeDasharray="2 4"
          />
          <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} className="stroke-border" />
          <path
            data-spring-curve
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <line
            ref={sweep}
            x1="0"
            x2="0"
            y1={PAD}
            y2={H - PAD}
            className="stroke-brand"
            strokeWidth="1"
            transform={`translate(${W - PAD})`}
          />
        </svg>
        <div className="relative overflow-clip rounded-md border bg-background">
          <div className="absolute inset-x-0 top-1/3 border-t" />
          <div className="absolute inset-x-0 top-2/3 border-t" />
          <MiniEvent
            ref={block}
            color={color}
            title=""
            className="absolute inset-x-2 top-2/3 -mt-3 h-6"
          />
        </div>
      </div>
    </Card>
  );
}

export function SpringLab() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {SPRINGS.map((s) => (
        <SpringCard key={s.id} {...s} />
      ))}
    </div>
  );
}
