"use client";

import { type ComponentType, lazy, Suspense } from "react";

const LOADERS: Record<string, () => Promise<{ default: ComponentType }>> = {
  "booking-page": () => import("./examples/booking-page"),
  "team-schedule": () => import("./examples/team-schedule"),
  "room-booking": () => import("./examples/room-booking"),
  "shift-roster": () => import("./examples/shift-roster"),
  "conference-agenda": () => import("./examples/conference-agenda"),
  "app-shell": () => import("./examples/app-shell"),
  "server-sync": () => import("./examples/server-sync"),
  "range-fetching": () => import("./examples/range-fetching"),
  "url-state": () => import("./examples/url-state"),
  "custom-persistence": () => import("./examples/custom-persistence"),
  "ics-import-export": () => import("./examples/ics-import-export"),
  "custom-event-block": () => import("./examples/custom-event-block"),
  "multi-timezone": () => import("./examples/multi-timezone"),
  "linked-calendars": () => import("./examples/linked-calendars"),
  "recurring-events": () => import("./examples/recurring-events"),
  "commands-and-keys": () => import("./examples/commands-and-keys"),
  "quick-add-planner": () => import("./examples/quick-add-planner"),
};

const COMPONENTS = Object.fromEntries(
  Object.entries(LOADERS).map(([slug, load]) => [slug, lazy(load)]),
) as Record<string, ComponentType>;

export function ExamplePreview({ name }: { name: string }) {
  const Component = COMPONENTS[name];
  if (!Component) return null;
  return (
    <Suspense
      fallback={
        <div className="grid min-h-136 place-items-center bg-muted/32 font-mono text-xs text-muted-foreground">
          loading
        </div>
      }
    >
      <Component />
    </Suspense>
  );
}
