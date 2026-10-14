"use client";

import { Avatar, AvatarFallback } from "@coss/ui/components/avatar";
import { Button } from "@coss/ui/components/button";
import { Kloq, type KloqView, useKloq } from "kloq";
import { BarChart3, CalendarDays, FolderKanban, Inbox, Share2 } from "lucide-react";
import { useState } from "react";
import { SegmentedControl, SegmentedControlItem } from "@/components/calendar/ui/segmented-control";
import { Nav } from "../parts";
import { shellEvents } from "./data";

const NAV = [
  { label: "Inbox", icon: Inbox },
  { label: "Projects", icon: FolderKanban },
  { label: "Calendar", icon: CalendarDays, active: true },
  { label: "Reports", icon: BarChart3 },
];

const VIEWS: { view: KloqView; label: string }[] = [
  { view: "day", label: "Day" },
  { view: 3, label: "3 days" },
  { view: "week", label: "Week" },
  { view: "month", label: "Month" },
];

/** The product's page header, fed by the calendar it sits inside. */
function Header() {
  const k = useKloq();
  return (
    <Kloq.Toolbar>
      <Nav />
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          size="sm"
          aria-label="View"
          value={k.viewSetting}
          onValueChange={k.switchView}
        >
          {VIEWS.map(({ view, label }) => (
            <SegmentedControlItem key={label} value={view} disabled={!(k.fits?.(view) ?? true)}>
              {label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        <Button variant="outline" size="sm">
          <Share2 />
          Share
        </Button>
        <Avatar>
          <AvatarFallback>SK</AvatarFallback>
        </Avatar>
      </div>
    </Kloq.Toolbar>
  );
}

export default function AppShellExample() {
  const [events] = useState(() => shellEvents(new Date()));
  return (
    <div className="@container flex flex-col">
      <div className="flex h-136">
        <aside className="hidden w-44 shrink-0 flex-col border-r bg-muted/32 @2xl:flex">
          <p className="flex items-center gap-2 px-4 py-3.5 font-heading text-sm font-semibold">
            <span aria-hidden className="size-2 rounded-xs bg-brand" />
            Orbit
          </p>
          <nav aria-label="Orbit" className="flex flex-col gap-0.5 px-2">
            {NAV.map(({ label, icon: Icon, active }) => (
              <Button
                key={label}
                variant="ghost"
                size="sm"
                className="justify-start aria-[current=page]:bg-accent"
                aria-current={active ? "page" : undefined}
              >
                <Icon />
                {label}
              </Button>
            ))}
          </nav>
          <p className="mt-auto border-t px-4 py-3 font-mono text-xs text-muted-foreground">
            acme · 12 seats
          </p>
        </aside>

        <div className="min-w-0 flex-1">
          <Kloq
            defaultEvents={events}
            defaultView={3}
            persistence={false}
            designMode={false}
            storage={false}
          >
            <Header />
          </Kloq>
        </div>
      </div>
    </div>
  );
}
