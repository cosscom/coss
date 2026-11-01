import { useEffect, useMemo, useRef, useState } from "react";
import { useColorScheme, useWindowDimensions } from "react-native";
import type { KloqChrome } from "./chrome-context.tsx";
import type { EventDraft } from "./draft.ts";
import { draftToEvent } from "./draft-event.ts";
import { buildSurface, padRange, slotFromPress, visibleEvents } from "./model.ts";
import {
  byResourceId,
  type CalEvent,
  type CalEventPatch,
  createSettings,
  defaultCalendarId,
  deleteOccurrence,
  editOccurrence,
  formatInstant,
  type KloqBatchOp,
  type KloqChange,
  type KloqStore,
  type KloqView,
  minutesOfDate,
  type PlacedOccurrence,
  parseInstant,
  parseQuickAdd,
  projectTimeline,
  type RecurrenceScope,
  resolveWindow,
  stepAnchor,
  toDateOnlyString,
  todayAnchor,
  useCalendarSources,
} from "./shared.ts";
import {
  changeForAdd,
  changeForBatch,
  changeForRemove,
  changeForUpdate,
  reduceEvents,
} from "./store.ts";
import type { KloqProps } from "./types.ts";

export interface ScopeRequest {
  action: "edit" | "delete";
  placed: PlacedOccurrence;
  draft?: EventDraft;
}

function patchOf(event: CalEvent): CalEventPatch {
  const { id: _id, ...patch } = event;
  return patch;
}

export function useKloqController(props: KloqProps) {
  const { width } = useWindowDimensions();
  const system = useColorScheme() === "dark" ? "dark" : "light";
  const scheme = props.scheme ?? system;
  const settings = useMemo(
    () =>
      createSettings({
        hourHeight: props.hourHeight,
        density: props.density,
        zoom: props.zoom,
        makeId: props.makeId,
        dayStartHour: props.dayStartHour,
        dayEndHour: props.dayEndHour,
        snapMinutes: props.snapMinutes,
        snapFineMinutes: props.snapFineMinutes,
        minEventMinutes: props.minEventMinutes,
        locale: props.locale,
        hour12: props.hour12,
        displayTimeZone: props.displayTimeZone,
        timeZones: props.timeZones,
      }),
    [
      props.hourHeight,
      props.density,
      props.zoom,
      props.makeId,
      props.dayStartHour,
      props.dayEndHour,
      props.snapMinutes,
      props.snapFineMinutes,
      props.minEventMinutes,
      props.locale,
      props.hour12,
      props.displayTimeZone,
      props.timeZones,
    ],
  );

  const controlled = props.events !== undefined;
  const [internal, setInternal] = useState<CalEvent[]>(props.defaultEvents ?? []);
  const events = controlled ? (props.events ?? []) : internal;
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const seeds = props.defaultEvents ?? [];
  const history = useRef<CalEvent[][]>([]);
  const future = useRef<CalEvent[][]>([]);
  const listeners = useRef(new Set<() => void>());

  const [viewState, setViewState] = useState<KloqView>(props.defaultView ?? "week");
  const view = props.view ?? viewState;
  const [dateState, setDateState] = useState(() => props.defaultDate ?? new Date());
  const date = props.date ?? dateState;
  const [lastStep, setLastStep] = useState<-1 | 1 | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickText, setQuickText] = useState("");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [scope, setScope] = useState<ScopeRequest | null>(null);
  const [now, setNow] = useState(() => new Date());
  const registry = useCalendarSources();
  const sources = props.sources ?? registry.sources;
  const narrow = width > 0 && width < 640;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const adapter = props.persistence;
    if (controlled || !adapter) return;
    let cancel = false;
    void Promise.resolve(adapter.load()).then((loaded) => {
      if (!cancel && loaded) setInternal(loaded);
    });
    return () => {
      cancel = true;
    };
  }, [controlled, props.persistence]);

  const weekStartsOn = props.weekStartsOn ?? 1;
  const surface = useMemo(
    () =>
      buildSurface({
        events,
        sources,
        view,
        date,
        weekStartsOn,
        width,
        responsive: props.responsive,
        settings,
        showDeclinedEvents: props.showDeclinedEvents,
        currentUserEmail: props.currentUserEmail,
        locale: props.locale,
      }),
    [
      events,
      sources,
      view,
      date,
      weekStartsOn,
      width,
      props.responsive,
      settings,
      props.showDeclinedEvents,
      props.currentUserEmail,
      props.locale,
    ],
  );

  const onRangeChange = props.onRangeChange;
  const rangePadding = props.rangePadding;
  useEffect(() => {
    const range = padRange(surface.range, rangePadding);
    onRangeChange?.(range.start, range.end);
  }, [surface.range, rangePadding, onRangeChange]);

  function publish(next: CalEvent[], change: KloqChange | null) {
    const prev = eventsRef.current;
    if (!controlled) setInternal(next);
    props.onEventsChange?.(next);
    if (props.persistence) void props.persistence.save(next);
    if (!change || !props.onCommit) return;
    const pending = props.onCommit(change);
    if (pending && typeof (pending as Promise<unknown>).then === "function") {
      void (pending as Promise<unknown>).catch(() => {
        if (!controlled) setInternal(prev);
        props.onEventsChange?.(prev);
        for (const listener of listeners.current) listener();
      });
    }
    for (const listener of listeners.current) listener();
  }

  function commit(change: KloqChange) {
    const prev = eventsRef.current;
    history.current.push(prev);
    future.current = [];
    const next = change.type === "reset" ? [...seeds] : reduceEvents(prev, change);
    publish(next, change);
  }

  function undo() {
    if (controlled) {
      props.onUndo?.();
      return;
    }
    const prev = history.current.pop();
    if (!prev) return;
    future.current.push(eventsRef.current);
    publish(prev, null);
  }

  function redo() {
    if (controlled) {
      props.onRedo?.();
      return;
    }
    const next = future.current.pop();
    if (!next) return;
    history.current.push(eventsRef.current);
    publish(next, null);
  }

  function switchView(next: KloqView) {
    if (props.view === undefined) setViewState(next);
    props.onViewChange?.(next);
  }

  function goToDate(next: Date) {
    if (props.date === undefined) setDateState(next);
    props.onDateChange?.(next);
  }

  const canCommand = props.commandPalette !== false;
  const lanes = props.lanes ?? [];
  const timelineWindow = useMemo(
    () => resolveWindow(props.timelineWindow, date),
    [props.timelineWindow, date],
  );
  const timelineEvents = useMemo(
    () =>
      projectTimeline(
        visibleEvents({
          events,
          sources,
          view,
          date,
          weekStartsOn,
          width,
          responsive: props.responsive,
          settings,
          showDeclinedEvents: props.showDeclinedEvents,
          currentUserEmail: props.currentUserEmail,
          locale: props.locale,
        }),
        lanes,
        timelineWindow,
        props.laneAdapter ?? byResourceId(),
      ).all,
    [
      events,
      sources,
      view,
      date,
      weekStartsOn,
      width,
      props.responsive,
      settings,
      props.showDeclinedEvents,
      props.currentUserEmail,
      props.locale,
      lanes,
      timelineWindow,
      props.laneAdapter,
    ],
  );

  const chrome: KloqChrome = {
    view: surface.view,
    viewSetting: view,
    collapsed: surface.responded.collapsed,
    narrow,
    ready: true,
    timeline: lanes.length > 0,
    canCommand,
    scheme,
    fits: () => true,
    date,
    atToday: surface.atToday,
    lastStep,
    step: (dir) => {
      setLastStep(dir);
      goToDate(stepAnchor(view, date, dir, typeof view === "number" ? view : undefined));
    },
    goToday: () => {
      setLastStep(null);
      goToDate(todayAnchor(view));
    },
    switchView,
    jumpToDay: (next) => {
      switchView("day");
      goToDate(next);
    },
    goToDate,
    reset: () => commit({ type: "reset" }),
    openCommand: () => {
      if (canCommand) setQuickOpen(true);
    },
    openShortcuts: () => setShortcutsOpen(true),
    undo,
    redo,
    keymap: props.keymap,
  };

  const lastTap = useRef({ id: "", at: 0 });

  function openPlaced(placed: PlacedOccurrence) {
    const at = Date.now();
    if (lastTap.current.id === placed.id && at - lastTap.current.at < 350) {
      props.onEventDoubleClick?.(placed.source, placed.id);
    }
    lastTap.current = { id: placed.id, at };
    setSelectedId(placed.id);
    props.onEventClick?.(placed.source, placed.id);
    props.onSelectionChange?.([placed.source]);
    setDraft(draftFromPlaced(placed));
  }

  function openSlot(day: Date, y: number) {
    const slot = slotFromPress(settings, day, y, props.constraints);
    if (!slot) return;
    props.onSlotClick?.(slot);
    setSelectedId(null);
    setDraft({
      title: "",
      start: slot.start,
      end: slot.end,
      allDay: false,
      reminders: [],
      calendarId: defaultCalendarId(sources),
    });
  }

  function saveDraft(next: EventDraft) {
    const event = draftToEvent(next, settings);
    const placed = surface.projection.all.find((item) => item.id === next.placementId);
    if (placed?.occurrence && placed.source.rrule) {
      setScope({ action: "edit", placed, draft: next });
      return;
    }
    if (!next.id) {
      commit(changeForAdd(event));
    } else {
      const change = changeForUpdate(eventsRef.current, next.id, patchOf(event));
      if (change) commit(change);
    }
    setDraft(null);
  }

  function deleteDraft() {
    if (!draft?.id) {
      setDraft(null);
      return;
    }
    const placed = surface.projection.all.find((item) => item.id === draft.placementId);
    if (placed?.occurrence && placed.source.rrule) {
      setScope({ action: "delete", placed });
      return;
    }
    const change = changeForRemove(eventsRef.current, draft.id);
    if (change) commit(change);
    setDraft(null);
    setSelectedId(null);
  }

  function chooseScope(choice: RecurrenceScope) {
    if (!scope?.placed.occurrence) {
      setScope(null);
      return;
    }
    const ops =
      scope.action === "delete"
        ? deleteOccurrence(scope.placed.source, scope.placed.occurrence, choice).ops
        : editOccurrence(
            scope.placed.source,
            scope.placed.occurrence,
            patchOf(draftToEvent(scope.draft ?? draftFromPlaced(scope.placed), settings)),
            choice,
            { makeId: settings.makeId },
          ).ops;
    commit(changeForBatch(eventsRef.current, ops as readonly KloqBatchOp[]));
    setScope(null);
    setDraft(null);
  }

  function commitQuick() {
    const result = parseQuickAdd(quickText, now);
    if (!result.start || !result.end) return;
    const allDay = result.allDay === true;
    const event: CalEvent = allDay
      ? {
          id: settings.makeId(),
          title: result.title.trim() || "Untitled",
          allDay: true,
          start: toDateOnlyString(result.start),
          end: toDateOnlyString(result.end),
          calendarId: defaultCalendarId(sources),
        }
      : {
          id: settings.makeId(),
          title: result.title.trim() || "Untitled",
          start: formatInstant(result.start, settings.displayZone),
          end: formatInstant(result.end, settings.displayZone),
          calendarId: defaultCalendarId(sources),
        };
    commit(changeForAdd(event));
    setQuickText("");
    setQuickOpen(false);
  }

  const quickResult = useMemo(() => parseQuickAdd(quickText, now), [quickText, now]);
  const store: KloqStore = {
    subscribe: (listener) => {
      listeners.current.add(listener);
      return () => {
        listeners.current.delete(listener);
      };
    },
    getSnapshot: () => eventsRef.current,
    getServerSnapshot: () => eventsRef.current,
    hydrate: () => {},
    reset: () => commit({ type: "reset" }),
    add: (event) => commit(changeForAdd(event)),
    update: (id, patch) => {
      const change = changeForUpdate(eventsRef.current, id, patch);
      if (change) commit(change);
    },
    remove: (id) => {
      const change = changeForRemove(eventsRef.current, id);
      if (change) commit(change);
    },
    batch: (ops) => commit(changeForBatch(eventsRef.current, ops)),
    get: (id) => eventsRef.current.find((event) => event.id === id),
  };

  return {
    scheme,
    settings,
    sources,
    surface,
    chrome,
    selectedId,
    draft,
    setDraft,
    scope,
    setScope,
    quickOpen,
    setQuickOpen,
    quickText,
    setQuickText,
    quickResult,
    now,
    store,
    shortcutsOpen,
    setShortcutsOpen,
    lanes,
    timelineWindow,
    timelineEvents,
    openPlaced,
    openSlot,
    saveDraft,
    deleteDraft,
    chooseScope,
    commitQuick,
    nowMinutes: minutesOfDate(settings.toDisplay(now)),
  };
}

function draftFromPlaced(placed: PlacedOccurrence): EventDraft {
  const start = new Date(parseInstant(placed.source.start));
  const end = new Date(parseInstant(placed.source.end));
  const allDay = placed.source.allDay === true;
  return {
    id: placed.source.id,
    placementId: placed.id,
    title: placed.source.title,
    start,
    end: allDay ? new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1) : end,
    allDay,
    calendarId: placed.source.calendarId,
    rrule: placed.source.rrule,
    reminders: placed.source.reminders ? [...placed.source.reminders] : [],
  };
}
