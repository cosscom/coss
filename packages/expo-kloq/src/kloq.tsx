import { BottomSheet, Button, Host, RNHostView, Row, ScrollView, Text } from "@expo/ui";
import { useMemo } from "react";
import { View } from "react-native";
import { ChromeProvider } from "./chrome-context.tsx";
import { EventSheet } from "./fields/event-sheet.tsx";
import { QuickAddInput } from "./fields/quick-add.tsx";
import { RecurrenceScopeDialog } from "./fields/recurrence-scope.tsx";
import { MultiTimeZoneGutter } from "./gutter-view.tsx";
import { SettingsProvider } from "./settings-context.tsx";
import { densityByDay, describeRRule } from "./shared.ts";
import { DEFAULT_COMPONENTS } from "./slots.tsx";
import { useKloqController } from "./state.tsx";
import { StoreProvider } from "./store-context.tsx";
import type { KloqProps } from "./types.ts";
import { AgendaView } from "./views/agenda.tsx";
import { MonthView } from "./views/month.tsx";
import { TimeGrid } from "./views/time-grid.tsx";
import { TimelineGrid } from "./views/timeline.tsx";
import { YearView } from "./views/year.tsx";

export type { KloqProps };

/**
 * The calendar. Children are the toolbar (`<KloqToolbar />`), rendered above
 * the surface — the same arrangement as kloq. The surface itself picks a
 * native view for month, agenda, year and timeline, and a React Native hour
 * canvas for day and week.
 */
export function Kloq(props: KloqProps) {
  const state = useKloqController(props);
  const slots = useMemo(() => ({ ...DEFAULT_COMPONENTS, ...props.components }), [props.components]);
  const kind = state.surface.view.kind;
  const timeGrid = kind === "day" || kind === "days" || kind === "week";
  const density = useMemo(() => {
    if (kind !== "year") return new Map();
    return densityByDay(
      state.surface.projection.all.map((event) => event.source),
      {
        start: state.surface.range.start,
        end: state.surface.range.end,
        timeZone: state.settings.displayZone,
      },
    );
  }, [kind, state.surface.projection.all, state.surface.range, state.settings.displayZone]);
  const scopeSummary = state.scope?.placed.source.rrule
    ? describeRRule(state.scope.placed.source.rrule)
    : undefined;

  return (
    <SettingsProvider value={state.settings}>
      <StoreProvider value={state.store}>
        <ChromeProvider value={state.chrome}>
          <View
            style={[
              { flex: 1, backgroundColor: state.scheme === "dark" ? "#09090b" : "#ffffff" },
              props.style,
            ]}
          >
            {props.children}
            {state.settings.timeZones.length > 0 ? (
              <MultiTimeZoneGutter at={state.now} hour12={props.hour12} />
            ) : null}
            {props.onTimeZonesClick ? (
              <Host matchContents>
                <Button variant="text" label="Time zones" onPress={props.onTimeZonesClick} />
              </Host>
            ) : null}
            {timeGrid && state.surface.projection.allDay.length > 0 ? (
              <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
                <ScrollView direction="horizontal">
                  <Row spacing={6}>
                    {state.surface.projection.allDay.map((event) => (
                      <Button
                        key={event.id}
                        variant="outlined"
                        label={event.title || "Untitled"}
                        onPress={() => state.openPlaced(event)}
                      />
                    ))}
                  </Row>
                </ScrollView>
              </Host>
            ) : null}
            <View style={{ flex: 1 }}>
              {timeGrid ? (
                <Host style={{ flex: 1 }} colorScheme={state.scheme}>
                  <RNHostView>
                    <TimeGrid
                      days={state.surface.view.days}
                      names={state.surface.view.namesShort}
                      events={state.surface.projection.timed}
                      settings={state.settings}
                      selectedId={state.selectedId}
                      todayIndex={state.surface.view.todayIndex}
                      nowMinutes={state.nowMinutes}
                      workingHours={props.workingHours}
                      slots={slots}
                      onEventPress={state.openPlaced}
                      onSlotPress={state.openSlot}
                      onHeaderPress={state.chrome.jumpToDay}
                    />
                  </RNHostView>
                </Host>
              ) : null}
              {kind === "month" && state.surface.month ? (
                <MonthView
                  view={state.surface.view}
                  month={state.surface.month}
                  onOpenDay={state.chrome.jumpToDay}
                  onOpenEvent={(event) => {
                    const placed = state.surface.projection.all.find(
                      (item) => item.id === event.id,
                    );
                    if (placed) state.openPlaced(placed);
                  }}
                />
              ) : null}
              {kind === "agenda" && state.surface.agenda ? (
                <AgendaView agenda={state.surface.agenda} onOpenEvent={state.openPlaced} />
              ) : null}
              {kind === "year" ? (
                <YearView
                  view={state.surface.view}
                  weekStartsOn={props.weekStartsOn ?? 1}
                  density={density}
                  onOpenDay={state.chrome.jumpToDay}
                  onOpenMonth={(month) => {
                    state.chrome.switchView("month");
                    state.chrome.goToDate(month);
                  }}
                />
              ) : null}
              {kind === "timeline" ? (
                <TimelineGrid
                  lanes={state.lanes}
                  events={state.timelineEvents}
                  window={state.timelineWindow}
                  selectedId={state.selectedId}
                  slots={slots}
                  onSelect={(id) => {
                    const placed = state.timelineEvents.find((event) => event.id === id);
                    if (placed) state.openPlaced(placed);
                  }}
                />
              ) : null}
            </View>
            <EventSheet
              open={state.draft !== null}
              draft={state.draft}
              sources={state.sources}
              onClose={() => state.setDraft(null)}
              onSubmit={state.saveDraft}
              onDelete={state.draft?.id ? state.deleteDraft : undefined}
            />
            <BottomSheet
              isPresented={state.quickOpen}
              onDismiss={() => state.setQuickOpen(false)}
              snapPoints={["half"]}
            >
              <ScrollView>
                <QuickAddInput
                  value={state.quickText}
                  onValueChange={state.setQuickText}
                  result={state.quickResult}
                  now={state.now}
                  onCommit={state.commitQuick}
                  onBack={() => state.setQuickOpen(false)}
                />
              </ScrollView>
            </BottomSheet>
            <BottomSheet
              isPresented={state.shortcutsOpen}
              onDismiss={() => state.setShortcutsOpen(false)}
            >
              <Host matchContents>
                <Text>Shortcuts stay on a keyboard. Use the toolbar on this device.</Text>
              </Host>
            </BottomSheet>
            <RecurrenceScopeDialog
              open={state.scope !== null}
              action={state.scope?.action ?? "edit"}
              summary={scopeSummary}
              onOpenChange={(open) => {
                if (!open) state.setScope(null);
              }}
              onChoose={state.chooseScope}
            />
          </View>
        </ChromeProvider>
      </StoreProvider>
    </SettingsProvider>
  );
}

export { Kloq as CalendarApp };
