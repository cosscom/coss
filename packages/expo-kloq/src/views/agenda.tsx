import { Host, List, ListItem, Text } from "@expo/ui";
import type { Agenda, PlacedOccurrence } from "../shared.ts";

export function AgendaView({
  agenda,
  onOpenEvent,
}: {
  agenda: Agenda;
  onOpenEvent: (event: PlacedOccurrence) => void;
}) {
  if (agenda.days.length === 0) {
    return (
      <Host matchContents>
        <Text>Nothing scheduled</Text>
      </Host>
    );
  }
  return (
    <Host style={{ flex: 1 }} useViewportSizeMeasurement>
      <List>
        {agenda.days.flatMap((day) => [
          <ListItem key={`day-${day.dayIndex}`}>{day.nameLong}</ListItem>,
          ...day.entries.map((entry) => (
            <ListItem
              key={`${day.dayIndex}-${entry.event.id}`}
              supportingText={entry.event.allDay ? "All day" : entry.event.title}
              onPress={() => onOpenEvent(entry.event as PlacedOccurrence)}
            >
              {entry.event.title || "Untitled"}
            </ListItem>
          )),
        ])}
      </List>
    </Host>
  );
}
