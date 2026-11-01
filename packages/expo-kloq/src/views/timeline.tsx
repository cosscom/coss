import { Button, Column, Host, List, ListItem, RNHostView, Row, Text } from "@expo/ui";
import { View } from "react-native";
import type { Lane, PlacedOccurrence, TimelineWindow } from "../shared.ts";
import { DEFAULT_COMPONENTS, type KloqComponents } from "../slots.tsx";

export interface TimelineGridProps {
  lanes: readonly Lane[];
  events: readonly PlacedOccurrence[];
  window: TimelineWindow;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  slots?: KloqComponents;
}

/**
 * One native row per lane. A custom `TimelineRow` slot is hosted in React
 * Native, because slot components are plain views.
 */
export function TimelineGrid({
  lanes,
  events,
  window,
  selectedId = null,
  onSelect,
  slots = DEFAULT_COMPONENTS,
}: TimelineGridProps) {
  if (slots.TimelineRow !== DEFAULT_COMPONENTS.TimelineRow) {
    const RowSlot = slots.TimelineRow;
    return (
      <Host style={{ flex: 1 }}>
        <RNHostView>
          <View>
            {lanes.map((lane, index) => (
              <RowSlot
                key={lane.id}
                lane={lane}
                events={events.filter((event) => event.laneIndex === index)}
                onPressEvent={(event) => onSelect?.(event.id)}
              />
            ))}
          </View>
        </RNHostView>
      </Host>
    );
  }
  return (
    <Host style={{ flex: 1 }} useViewportSizeMeasurement>
      <Column spacing={8}>
        <Text textStyle={{ fontSize: 12 }}>
          {`${window.start.toDateString()} – ${window.end.toDateString()}`}
        </Text>
        <List>
          {lanes.map((lane, index) => {
            const row = events.filter((event) => event.laneIndex === index);
            return (
              <ListItem key={lane.id} supportingText={lane.sublabel ?? `${row.length} events`}>
                {lane.label}
              </ListItem>
            );
          })}
        </List>
        {lanes.map((lane, index) => (
          <Row key={lane.id} spacing={6}>
            {events
              .filter((event) => event.laneIndex === index)
              .map((event) => (
                <Button
                  key={event.id}
                  variant={selectedId === event.id ? "filled" : "outlined"}
                  label={event.title || "Untitled"}
                  onPress={() => onSelect?.(event.id)}
                />
              ))}
          </Row>
        ))}
      </Column>
    </Host>
  );
}
