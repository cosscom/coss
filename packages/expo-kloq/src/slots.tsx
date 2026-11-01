import type { ComponentType } from "react";
import { Pressable, Text, useColorScheme, View } from "react-native";
import { eventSolid } from "./colors.ts";
import type { Lane, PlacedEvent, PlacedOccurrence, TimelineWindow } from "./shared.ts";

/**
 * Slot contracts. Data fields match kloq. Pointer-registration fields
 * (`registerNode`, `onPointerDown`) are not part of the native contract:
 * press and long-press replace them. The default blocks are React Native
 * views because they sit on the absolutely positioned time canvas — see
 * `NATIVE_MAP`.
 */
export interface EventLayout {
  col: number;
  cols: number;
}

export interface EventBlockProps {
  event: PlacedEvent;
  dayCount: number;
  dayNamesShort: readonly string[];
  layout: EventLayout;
  selected: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

export interface AllDayChipProps {
  event: PlacedEvent;
  selected: boolean;
  onPress?: () => void;
}

export interface EventPanelProps {
  event: PlacedOccurrence | null;
  onClose: () => void;
}

export interface TimeGutterProps {
  ticks: readonly { minutes: number; label: string; top: number }[];
  height: number;
}

export interface DayHeaderProps {
  date: Date;
  name: string;
  isToday: boolean;
  onPress?: () => void;
}

export interface NowIndicatorProps {
  top: number;
}

export interface ResourceGutterProps {
  lane: Lane;
}

export interface TimelineHeaderProps {
  window: TimelineWindow;
}

export interface TimelineRowProps {
  lane: Lane;
  events: readonly PlacedOccurrence[];
  onPressEvent?: (event: PlacedOccurrence) => void;
}

export interface TimelineBlockProps {
  event: PlacedOccurrence;
  selected: boolean;
  onPress?: () => void;
}

export interface KloqComponents {
  EventBlock: ComponentType<EventBlockProps>;
  AllDayChip: ComponentType<AllDayChipProps>;
  EventPanel: ComponentType<EventPanelProps>;
  TimeGutter: ComponentType<TimeGutterProps>;
  DayHeader: ComponentType<DayHeaderProps>;
  NowIndicator: ComponentType<NowIndicatorProps>;
  ResourceGutter: ComponentType<ResourceGutterProps>;
  TimelineHeader: ComponentType<TimelineHeaderProps>;
  TimelineRow: ComponentType<TimelineRowProps>;
  TimelineBlock: ComponentType<TimelineBlockProps>;
}

export function EventBlock({ event, selected, onPress, onLongPress }: EventBlockProps) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const color = eventSolid(event.color, scheme);
  const ink = scheme === "dark" ? "#fafafa" : "#18181b";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={event.title}
      onPress={onPress}
      onLongPress={onLongPress}
      style={{
        flex: 1,
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        backgroundColor: selected ? color : `${color}22`,
        borderLeftWidth: 3,
        borderLeftColor: color,
        overflow: "hidden",
      }}
    >
      <Text numberOfLines={2} style={{ color: selected ? "#fff" : ink, fontSize: 12 }}>
        {event.title || "Untitled"}
      </Text>
    </Pressable>
  );
}

export function AllDayChip({ event, selected, onPress }: AllDayChipProps) {
  return (
    <EventBlock
      event={event}
      dayCount={1}
      dayNamesShort={[]}
      layout={{ col: 0, cols: 1 }}
      selected={selected}
      onPress={onPress}
    />
  );
}

export function EventPanel(_props: EventPanelProps) {
  return null;
}

export function TimeGutter({ ticks, height }: TimeGutterProps) {
  return (
    <View style={{ width: 52, height }}>
      {ticks.map((tick) => (
        <Text
          key={tick.minutes}
          style={{
            position: "absolute",
            top: tick.top - 7,
            right: 6,
            fontSize: 10,
            color: "#71717a",
          }}
        >
          {tick.label}
        </Text>
      ))}
    </View>
  );
}

export function DayHeader({ name, isToday, onPress }: DayHeaderProps) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: "center", paddingVertical: 6 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: isToday ? "700" : "500",
          color: isToday ? "#18181b" : "#71717a",
        }}
      >
        {name}
      </Text>
    </Pressable>
  );
}

export function NowIndicator({ top }: NowIndicatorProps) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: "#e11d48",
      }}
    />
  );
}

export function ResourceGutter({ lane }: ResourceGutterProps) {
  return <Text style={{ fontSize: 13, color: "#18181b" }}>{lane.label}</Text>;
}

export function TimelineHeader({ window }: TimelineHeaderProps) {
  return (
    <Text style={{ fontSize: 12, color: "#71717a" }}>
      {window.start.toDateString()} – {window.end.toDateString()}
    </Text>
  );
}

export function TimelineRow({ lane, events, onPressEvent }: TimelineRowProps) {
  return (
    <View style={{ paddingVertical: 8 }}>
      <Text style={{ fontSize: 14, fontWeight: "600" }}>{lane.label}</Text>
      {lane.sublabel ? (
        <Text style={{ fontSize: 12, color: "#71717a" }}>{lane.sublabel}</Text>
      ) : null}
      {events.map((event) => (
        <Text
          key={event.id}
          onPress={() => onPressEvent?.(event)}
          style={{ fontSize: 13, paddingVertical: 2 }}
        >
          {event.title || "Untitled"}
        </Text>
      ))}
    </View>
  );
}

export function TimelineBlock({ event, selected, onPress }: TimelineBlockProps) {
  return (
    <EventBlock
      event={event}
      dayCount={1}
      dayNamesShort={[]}
      layout={{ col: 0, cols: 1 }}
      selected={selected}
      onPress={onPress}
    />
  );
}

export const DEFAULT_COMPONENTS: KloqComponents = {
  EventBlock,
  AllDayChip,
  EventPanel,
  TimeGutter,
  DayHeader,
  NowIndicator,
  ResourceGutter,
  TimelineHeader,
  TimelineRow,
  TimelineBlock,
};
