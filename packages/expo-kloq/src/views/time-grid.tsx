import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { hourTicks, layoutTimed, workingBand } from "../model.ts";
import type { KloqSettings, PlacedOccurrence } from "../shared.ts";
import { DayHeader, EventBlock, type KloqComponents, NowIndicator, TimeGutter } from "../slots.tsx";
import type { WorkingHours } from "../working-hours.ts";

/**
 * Hour canvas. React Native absolute layout, hosted by `RNHostView` so the
 * rest of the calendar stays in SwiftUI or Compose. @expo/ui has no free-form
 * overlap grid.
 */
export function TimeGrid({
  days,
  names,
  events,
  settings,
  selectedId,
  todayIndex,
  nowMinutes,
  workingHours,
  slots,
  onEventPress,
  onSlotPress,
  onHeaderPress,
}: {
  days: readonly Date[];
  names: readonly string[];
  events: readonly PlacedOccurrence[];
  settings: KloqSettings;
  selectedId: string | null;
  todayIndex: number;
  nowMinutes: number | null;
  workingHours?: WorkingHours | false;
  slots: KloqComponents;
  onEventPress: (event: PlacedOccurrence) => void;
  onSlotPress: (day: Date, y: number) => void;
  onHeaderPress: (day: Date) => void;
}) {
  const [width, setWidth] = useState(0);
  const ticks = useMemo(() => hourTicks(settings), [settings]);
  const band = workingBand(settings, workingHours);
  const gutter = 52;
  const columnWidth = Math.max(88, width > 0 ? (width - gutter) / Math.max(1, days.length) : 88);
  const Header = slots.DayHeader ?? DayHeader;
  const Gutter = slots.TimeGutter ?? TimeGutter;
  const Block = slots.EventBlock ?? EventBlock;
  const Now = slots.NowIndicator ?? NowIndicator;

  return (
    <View style={{ flex: 1 }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View style={{ flexDirection: "row", marginLeft: gutter }}>
        {days.map((day, index) => (
          <View key={day.toISOString()} style={{ width: columnWidth }}>
            <Header
              date={day}
              name={names[index] ?? ""}
              isToday={index === todayIndex}
              onPress={() => onHeaderPress(day)}
            />
          </View>
        ))}
      </View>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", height: settings.canvasHeight }}>
          <Gutter ticks={ticks} height={settings.canvasHeight} />
          {days.map((day, index) => {
            const columnEvents = events.filter((event) => event.laneIndex === index);
            const laid = layoutTimed(columnEvents, settings);
            return (
              <Pressable
                key={day.toISOString()}
                style={{ width: columnWidth, height: settings.canvasHeight }}
                onPress={(event) => onSlotPress(day, event.nativeEvent.locationY)}
              >
                {ticks.map((tick) => (
                  <View
                    key={tick.minutes}
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      top: tick.top,
                      left: 0,
                      right: 0,
                      height: 1,
                      backgroundColor: "rgba(127,127,127,0.25)",
                    }}
                  />
                ))}
                {band ? (
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      top: band.top,
                      height: band.height,
                      left: 0,
                      right: 0,
                      backgroundColor: "rgba(127,127,127,0.06)",
                    }}
                  />
                ) : null}
                {index === todayIndex && nowMinutes !== null ? (
                  <Now top={settings.minutesToPx(nowMinutes)} />
                ) : null}
                {laid.map((block) => (
                  <View
                    key={block.event.id}
                    style={{
                      position: "absolute",
                      top: block.top,
                      height: block.height,
                      left: (block.column / block.columns) * columnWidth + 2,
                      width: columnWidth / block.columns - 4,
                    }}
                  >
                    <Block
                      event={block.event}
                      dayCount={days.length}
                      dayNamesShort={names}
                      layout={{ col: block.column, cols: block.columns }}
                      selected={selectedId === block.event.id}
                      onPress={() => onEventPress(block.event)}
                    />
                  </View>
                ))}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
