"use client";

import { Avatar, AvatarFallback } from "@coss/ui/components/avatar";
import { Button } from "@coss/ui/components/button";
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from "@coss/ui/components/sheet";
import {
  downloadICS,
  EVENT_COLORS,
  type EventPanelProps,
  formatRange,
  initialsFor,
  Kloq,
  type KloqView,
  parseInstant,
  useKloq,
} from "kloq";
import { useState } from "react";
import { SegmentedControl, SegmentedControlItem } from "@/components/calendar/ui/segmented-control";
import { Bar, Dot, Nav } from "../parts";
import { CONFERENCE, conferenceDays, programme } from "./data";

const LOCALE = "en-GB";
const CLOCK = { locale: LOCALE, hour12: false };
const VIEWS: { id: KloqView; label: string }[] = [
  { id: "agenda", label: "Programme" },
  { id: "day", label: "Timetable" },
];
// the details sheet takes the event panel's slot, so it opens from every view and replaces the editor
const SLOTS = { EventPanel: SessionSheet };

export default function ConferenceAgendaExample() {
  const [view, setView] = useState<KloqView>("agenda");
  const [date, setDate] = useState(() => conferenceDays()[0]);
  const [events] = useState(() => programme());

  return (
    <div className="@container flex flex-col">
      <div className="h-136">
        <Kloq
          view={view}
          onViewChange={setView}
          date={date}
          onDateChange={setDate}
          weekStartsOn={1}
          locale={LOCALE}
          hour12={false}
          dayStartHour={8}
          dayEndHour={19}
          workingHours={false}
          events={events}
          components={SLOTS}
          persistence={false}
          designMode={false}
          storage={false}
        >
          <Header />
        </Kloq>
      </div>
    </div>
  );
}

function Header() {
  const k = useKloq();
  return (
    <Bar>
      <span className="font-heading text-sm font-semibold tracking-tight text-foreground">
        {CONFERENCE.name}
      </span>
      <span>
        {CONFERENCE.city} · {CONFERENCE.days} days
      </span>
      <div className="ms-auto flex flex-wrap items-center gap-x-4 gap-y-2">
        {k.viewSetting === "day" && <Nav locale={LOCALE} />}
        <SegmentedControl
          size="sm"
          aria-label="View"
          value={k.viewSetting}
          onValueChange={k.switchView}
        >
          {VIEWS.map((v) => (
            <SegmentedControlItem key={v.id} value={v.id}>
              {v.label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>
    </Bar>
  );
}

function SessionSheet({ event, onClose }: EventPanelProps) {
  // the slot unmounts on `onClose`; holding `open` here lets the sheet play its exit first
  const [open, setOpen] = useState(true);
  const session = event.source;
  const day = new Date(parseInstant(event.start)).toLocaleDateString(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Sheet open={open} onOpenChange={setOpen} onOpenChangeComplete={(next) => !next && onClose()}>
      <SheetPopup>
        <SheetHeader>
          <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <Dot className={EVENT_COLORS[event.color].bar} />
            {session.location}
          </p>
          <SheetTitle className="text-balance">{session.title}</SheetTitle>
          <SheetDescription className="font-mono text-xs tabular-nums">
            {day} · {formatRange(event.startMin, event.endMin, CLOCK)}
          </SheetDescription>
        </SheetHeader>
        <SheetPanel className="flex flex-col gap-4">
          {session.description && (
            <p className="text-sm leading-relaxed text-pretty">{session.description}</p>
          )}
          {session.attendees?.length ? (
            <ul className="flex flex-col gap-2">
              {session.attendees.map((a) => (
                <li key={a.email} className="flex items-center gap-2.5 text-sm">
                  <Avatar>
                    <AvatarFallback>{initialsFor(a)}</AvatarFallback>
                  </Avatar>
                  {a.name}
                </li>
              ))}
            </ul>
          ) : null}
        </SheetPanel>
        <SheetFooter>
          <Button variant="outline" onClick={() => downloadICS(session)}>
            Add to my calendar
          </Button>
        </SheetFooter>
      </SheetPopup>
    </Sheet>
  );
}
