import { type CalEvent, type EventColor, instantAt, resolveView } from "kloq";

export type DeployStatus = "passed" | "running" | "failed" | "queued";

export interface Deploy {
  id: string;
  service: string;
  status: DeployStatus;
  /** days from today, minutes from midnight, length in minutes */
  day: number;
  at: number;
  minutes: number;
}

export const STATUS_COLOR: Record<DeployStatus, EventColor> = {
  passed: "emerald",
  running: "amber",
  failed: "rose",
  queued: "blue",
};

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

export const DEPLOYS: Deploy[] = [
  { id: "dep-api-1", service: "api", status: "passed", day: 0, at: h(8, 30), minutes: 40 },
  { id: "dep-web-1", service: "web", status: "passed", day: 0, at: h(9), minutes: 40 },
  { id: "dep-worker-1", service: "worker", status: "failed", day: 0, at: h(10, 15), minutes: 20 },
  { id: "dep-api-2", service: "api", status: "running", day: 0, at: h(11), minutes: 45 },
  { id: "dep-search-1", service: "search", status: "queued", day: 0, at: h(14), minutes: 30 },
  { id: "dep-billing-1", service: "billing", status: "queued", day: 0, at: h(16), minutes: 60 },
  { id: "dep-web-2", service: "web", status: "queued", day: 1, at: h(9), minutes: 40 },
  { id: "dep-db-1", service: "db-migrate", status: "queued", day: 1, at: h(11, 30), minutes: 90 },
  { id: "dep-api-3", service: "api", status: "queued", day: 1, at: h(15), minutes: 25 },
  { id: "dep-worker-2", service: "worker", status: "queued", day: 2, at: h(10), minutes: 20 },
  { id: "dep-web-3", service: "web", status: "queued", day: 2, at: h(13, 30), minutes: 40 },
];

/** The domain record behind an event, joined by store id. */
export const deployById = new Map(DEPLOYS.map((d) => [d.id, d]));

/** The deploys as calendar events, laid over the three days from `now`. */
export function deployEvents(now: Date): CalEvent[] {
  const view = resolveView(3, 1, now);
  return DEPLOYS.map((d) => ({
    id: d.id,
    title: d.service,
    color: STATUS_COLOR[d.status],
    start: instantAt(view, d.day, d.at),
    end: instantAt(view, d.day, d.at + d.minutes),
  }));
}
