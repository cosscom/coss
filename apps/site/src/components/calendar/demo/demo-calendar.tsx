"use client";

/**
 * The demo shell around <Kloq> — wires the async fake server, the
 * design-mode Network section, the dual-timezone gutter slot override, and
 * the failure toast. Everything here is consumer-land code: it only uses
 * the package's public API.
 */

import { Button } from "@coss/ui/components/button";
import { Separator } from "@coss/ui/components/separator";
import { ToastProvider, toastManager } from "@coss/ui/components/toast";
import {
  type CalEvent,
  getCalendarSources,
  isVisible,
  Kloq,
  type KloqChange,
  registerCommands,
  subscribeCalendarSources,
  toggleCalendarVisible,
} from "kloq";
import { registerNetworkSim } from "kloq/design-mode";
import type { KloqPreferences } from "kloq/settings";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { FakeServer } from "./fake-server";
import { mockSeedEvents, registerMockAccounts } from "./mock-accounts";
import { OnboardingDemo } from "./onboarding";
import {
  loadPreferences,
  preferencesToKloqProps,
  SettingsDemo,
  savePreferences,
} from "./settings-demo";
import { parseStress, type StressOptions, stressEvents } from "./stress";

/** ids whose blocks are on the wire for a given change */
const idsOf = (change: KloqChange): string[] => {
  switch (change.type) {
    case "add":
      return [change.event.id];
    case "update":
      return [change.id];
    default:
      return []; // removed blocks are gone; reset has no single target
  }
};

const setSyncing = (id: string, on: boolean) => {
  document
    .querySelectorAll<HTMLElement>(`[data-cal-event="${CSS.escape(id)}"]`)
    .forEach((el) =>
      on ? el.setAttribute("data-syncing", "") : el.removeAttribute("data-syncing"),
    );
};

/**
 * `?events=50000` seeds a stress store; add `&paged=1` to serve it through
 * onRangeChange a page at a time, `&pad=14` to widen each fetch by N days.
 * Read after mount so the route stays static; the calendar remounts onto it.
 */
let stressSeen: { search: string; value: StressOptions | null } | null = null;
const readStress = () => {
  const search = location.search;
  if (stressSeen?.search !== search)
    stressSeen = {
      search,
      value: parseStress(Object.fromEntries(new URLSearchParams(search))),
    };
  return stressSeen.value;
};
const noStress = () => null;
const never = () => () => {};

function useStress(): StressOptions | null {
  return useSyncExternalStore(never, readStress, noStress);
}

export function DemoCalendar() {
  const stress = useStress();
  const server = useRef<FakeServer | null>(null);
  if (server.current === null) server.current = new FakeServer();
  /* Zones you can actually pick, rather than a hardcoded UTC column.
     `displayZone` redraws the whole grid; `gutterZones` adds columns beside
     the local one. Empty string = "off" / "local". */
  const [displayZone, setDisplayZone] = useState("");
  const [gutterZones, setGutterZones] = useState<string[]>([]);

  /*
   * Preferences live HERE, not in the dialog: "show weekends" and "start week
   * on" are props on <Kloq>, so the only place they can be owned is the host.
   * `loadPreferences` is called lazily (not as an initial value expression)
   * so the server render and the first client render agree — localStorage is
   * read in an effect, the same rule the theme restore script follows.
   */
  const [prefs, setPrefs] = useState<KloqPreferences>(loadPreferences);
  useEffect(() => setPrefs(loadPreferences()), []);
  const prefProps = preferencesToKloqProps(prefs);
  const changePrefs = (next: KloqPreferences) => {
    setPrefs(next);
    savePreferences(next);
  };

  /*
   * The mock accounts. This is the entire "integration": two fake accounts
   * with five calendars, registered from an effect, unregistered on unmount.
   * A real Google/Outlook integration is the same call with different data —
   * the component never learns which it got.
   */
  useEffect(() => registerMockAccounts(), []);

  // Seeds carrying calendarIds, resolved once so a remount doesn't reshuffle.
  const seedEvents = useMemo(
    () => (stress ? stressEvents(stress.count) : mockSeedEvents()),
    [stress],
  );

  /*
   * `?events=N&paged=1`: the server holds all N and the calendar is
   * CONTROLLED, holding only what onRangeChange has fetched so far — pages
   * merge by id, so a page never replaces its neighbours. The server applies
   * every commit, so refetching a page you dragged on returns the drag.
   */
  const paged = !!stress?.paged;
  const [pageEvents, setPageEvents] = useState<CalEvent[]>([]);
  const [fetched, setFetched] = useState<{ start: Date; end: Date } | null>(null);
  useEffect(() => {
    if (paged) server.current!.seed(seedEvents);
  }, [paged, seedEvents]);
  const onRangeChange = useCallback(
    (start: Date, end: Date) => {
      if (!paged) return;
      void server.current!.fetchRange(start, end).then((page) => {
        setFetched({ start, end });
        setPageEvents((prev) => {
          const byId = new Map(prev.map((e) => [e.id, e]));
          for (const e of page) byId.set(e.id, e);
          return [...byId.values()];
        });
      });
    },
    [paged],
  );

  /*
   * ⌘K completeness, the teardown's strongest rule: every calendar's
   * visibility is an action, so every calendar is in ⌘K. Re-registered on
   * every registry change so the checkmarks track the sidebar.
   */
  useEffect(() => {
    let off = () => {};
    const sync = () => {
      off();
      off = registerCommands(
        ...getCalendarSources().map((cal) => ({
          id: `demo:calendar:${cal.id}`,
          label: `Show "${cal.name}" calendar`,
          keywords: "calendar visibility hide show",
          group: "Calendars",
          checked: isVisible(cal),
          run: () => toggleCalendarVisible(cal.id),
        })),
      );
    };
    sync();
    const unsub = subscribeCalendarSources(sync);
    return () => {
      unsub();
      off();
    };
  }, []);

  /* Registered from mount and left registered. The sim starts disabled and
     design mode's Network section switches it — which is the whole reason
     `setEnabled` exists: registering on a toggle meant the panel only showed
     up after you'd already turned the thing on somewhere else. */
  useEffect(() => {
    registerNetworkSim(server.current!.handle);
    return () => registerNetworkSim(null);
  }, []);

  /* Always wired. The server is inert while the sim is disabled — no delay,
     no failure — so this is the local path until design mode says otherwise. */
  const onCommit = (change: KloqChange) => {
    const ids = idsOf(change);
    ids.forEach((id) => setSyncing(id, true));
    return server
      .current!.commit(change)
      .catch((err) => {
        toastManager.add({
          title: "Couldn't save",
          description: "The change was reverted.",
        });
        throw err; // rejection is what triggers the revert spring
      })
      .finally(() => ids.forEach((id) => setSyncing(id, false)));
  };

  return (
    <ToastProvider position="bottom-center">
      <OnboardingDemo
        prefs={prefs}
        onPrefsChange={changePrefs}
        displayZone={displayZone}
        onDisplayZoneChange={setDisplayZone}
        gutterZone={gutterZones[0] ?? ""}
        onGutterZoneChange={(z) => setGutterZones(z ? [z] : [])}
      />

      <div className="flex h-dvh">
        <div className="flex min-w-0 flex-1 flex-col">
          <Kloq
            key={stress ? `stress:${stress.count}:${stress.paged}` : "demo"}
            {...(paged
              ? { events: pageEvents, onEventsChange: setPageEvents }
              : { defaultEvents: seedEvents })}
            // 50k events don't belong in localStorage
            persistence={stress ? false : undefined}
            onRangeChange={onRangeChange}
            rangePadding={stress?.padding}
            displayTimeZone={displayZone || undefined}
            timeZones={gutterZones}
            // the half of the preferences the component has props for today;
            // see `preferencesToKloqProps` for the half it doesn't
            /* `defaultView`, not `view`: passing `view` makes the calendar
               CONTROLLED, and this demo has nowhere to put an `onViewChange`
               — so the switcher reported every press and nothing ever moved.
               A preference seeds the view; the switcher owns it after that. */
            defaultView={prefProps.view}
            onViewChange={(v) => {
              // keep the weekends preference honest when the user picks a
              // 7-day week (or leaves one) from the switcher
              if (v === "week" && !prefs.showWeekends)
                changePrefs({ ...prefs, showWeekends: true });
              else if (v === 5 && prefs.showWeekends)
                changePrefs({ ...prefs, showWeekends: false });
            }}
            weekStartsOn={prefProps.weekStartsOn}
            locale={prefProps.locale}
            onCommit={onCommit}
            currentUserEmail="sam@example.com"
          >
            {/* <Kloq> renders no chrome of its own — the app bar is composed
                here, in consumer-land, which is the whole point of the
                embeddable split. The parts read shared state via useKloq(). */}
            <Kloq.Toolbar>
              <h1 className="shrink-0 font-bold font-heading text-lg [font-variation-settings:'GEOM'_50,'opsz'_32]">
                <Link className="text-foreground" href="/calendar">
                  coss.com <span className="text-muted-foreground/64">calendar</span>
                </Link>
              </h1>
              <div className="flex flex-auto items-center gap-2">
                <Kloq.Nav />
                {stress && (
                  <p className="hidden shrink-0 text-muted-foreground text-xs tabular-nums md:block">
                    {paged
                      ? `${pageEvents.length.toLocaleString()} of ${stress.count.toLocaleString()} loaded` +
                        (fetched
                          ? ` · fetched ${fetched.start.toLocaleDateString()} – ${fetched.end.toLocaleDateString()} (±${stress.padding}d)`
                          : " · fetching…")
                      : `${stress.count.toLocaleString()} events in store`}
                  </p>
                )}
                {/* reset lives in ⌘K too, and install is a docs link — neither earns phone width */}
                <div className="hidden items-center gap-2 sm:flex">
                  <Kloq.Reset />
                  <Separator orientation="vertical" className="mx-1 h-5" />
                  <Button size="sm" render={<Link href="/calendar/docs/installation" />}>
                    Install
                  </Button>
                </div>
              </div>
            </Kloq.Toolbar>

            {/* A dialog, so it portals and takes no layout space — but it's
                a child of <Kloq> on purpose, so it can read the live store
                and settings through context. */}
            <SettingsDemo value={prefs} onChange={setPrefs} />
          </Kloq>
        </div>
      </div>
    </ToastProvider>
  );
}
