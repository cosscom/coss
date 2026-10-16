"use client";

import { Area } from "@/components/charts/area";
import { AreaChart } from "@/components/charts/area-chart";
import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarXAxis } from "@/components/charts/bar-x-axis";
import { Grid } from "@/components/charts/grid";
import { Line } from "@/components/charts/line";
import { LineChart } from "@/components/charts/line-chart";
import { ChartTooltip } from "@/components/charts/tooltip";
import { XAxis } from "@/components/charts/x-axis";
import { tokens, usd } from "@/lib/format";

/*
 * Insights' charts, on bklit's chart components (`src/components/charts`, from its shadcn
 * registry). The series are made up, deterministically from the project's slug: the prototype
 * keeps no per-day history.
 */

function rng(seed: string) {
  let state = [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 11);
  return () => {
    state = (state * 1_103_515_245 + 12_345) >>> 0;
    return (state >>> 8) / 0x01_00_00_00;
  };
}

const DAY = 86_400_000;

function series(seed: string, perDay: number, costPerPrompt: number, now: Date) {
  const rand = rng(seed);
  const start = new Date(now.getTime() - 89 * DAY);
  start.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 90 }, (_, i) => {
    const date = new Date(start.getTime() + i * DAY);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const trend = 0.75 + (i / 90) * 0.5;
    const prompts = Math.round(perDay * trend * (weekend ? 0.35 : 1) * (0.6 + rand() * 0.8));
    const shipped = Math.round(prompts * (0.78 + rand() * 0.14));
    return { date, prompts, shipped };
  });
  const weeks = Array.from({ length: 12 }, (_, w) => {
    const slice = days.slice(w * 7, w * 7 + 7);
    const shipped = slice.reduce((sum, d) => sum + d.shipped, 0);
    const perPrompt = 260_000 * (0.85 + rand() * 0.3);
    const burned = Math.round(shipped * perPrompt);
    return {
      name: `W${w + 1}`,
      date: slice[0]?.date ?? start,
      input: Math.round(burned * 0.82),
      output: burned - Math.round(burned * 0.82),
      cost: Math.round(costPerPrompt * (0.8 + rand() * 0.4) * 100) / 100,
      auto: Math.round(costPerPrompt * 0.35 * (0.8 + rand() * 0.4) * 100) / 100,
    };
  });
  return { days, weeks };
}

const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export function InsightCharts({
  seed,
  perDay,
  costPerPrompt,
}: {
  seed: string;
  perDay: number;
  costPerPrompt: number;
}) {
  const { days, weeks } = series(seed, perDay, costPerPrompt, new Date());
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Chart title="Prompts opened and shipped, last 90 days" className="lg:col-span-2">
        <AreaChart aspectRatio="4 / 1" className="w-full" data={days}>
          <Grid numTicksRows={4} />
          <Area dataKey="prompts" fill="var(--chart-3)" fillOpacity={0.25} />
          <Area dataKey="shipped" fill="var(--chart-1)" fillOpacity={0.35} />
          <XAxis numTicks={6} />
          <ChartTooltip
            rows={(point) => [
              { color: "var(--chart-3)", label: "Opened", value: String(point.prompts) },
              { color: "var(--chart-1)", label: "Shipped", value: String(point.shipped) },
            ]}
          />
        </AreaChart>
      </Chart>
      <Chart title="Tokens the factory burned, per week">
        <BarChart aspectRatio="2 / 1" className="w-full" data={weeks} stacked>
          <Grid numTicksRows={4} />
          <Bar dataKey="input" fill="var(--chart-2)" />
          <Bar dataKey="output" fill="var(--chart-1)" />
          <BarXAxis />
          <ChartTooltip
            rows={(point) => [
              { color: "var(--chart-2)", label: "Input", value: tokens(Number(point.input)) },
              { color: "var(--chart-1)", label: "Output", value: tokens(Number(point.output)) },
            ]}
          />
        </BarChart>
      </Chart>
      <Chart title="Cost per prompt to production, per week">
        <LineChart aspectRatio="2 / 1" className="w-full" data={weeks}>
          <Grid numTicksRows={4} />
          <Line dataKey="cost" stroke="var(--chart-1)" />
          <Line dataKey="auto" stroke="var(--chart-3)" />
          <XAxis numTicks={6} />
          <ChartTooltip
            rows={(point) => [
              { color: "var(--chart-1)", label: "All prompts", value: usd(Number(point.cost)) },
              { color: "var(--chart-3)", label: "Auto-allowed", value: usd(Number(point.auto)) },
            ]}
          />
        </LineChart>
      </Chart>
    </div>
  );
}

function Chart({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-lg border ${className}`}>
      <h2 className="border-b px-4 py-2.5 font-medium text-sm">{title}</h2>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}
