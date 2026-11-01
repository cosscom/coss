import { Button, Column, Host, Row, ScrollView, Text } from "@expo/ui";
import type { MonthLayout, PlacedEvent, ViewDescriptor } from "../shared.ts";

export function MonthView({
  view,
  month,
  onOpenDay,
  onOpenEvent,
}: {
  view: ViewDescriptor;
  month: MonthLayout;
  onOpenDay: (date: Date) => void;
  onOpenEvent: (event: PlacedEvent) => void;
}) {
  const weeks: Date[][] = [];
  for (let week = 0; week < view.days.length; week += 7) {
    weeks.push(view.days.slice(week, week + 7));
  }
  return (
    <Host style={{ flex: 1 }}>
      <ScrollView>
        <Column spacing={4}>
          <Row spacing={2}>
            {view.namesShort.slice(0, 7).map((name) => (
              <Text key={name} textStyle={{ fontSize: 12, fontWeight: "600" }}>
                {name}
              </Text>
            ))}
          </Row>
          {weeks.map((week) => (
            <Row key={week[0]?.toISOString() ?? "week"} spacing={2}>
              {week.map((day) => {
                const index = view.days.findIndex((item) => item.getTime() === day.getTime());
                const inMonth = view.month ? day.getMonth() === view.month.getMonth() : true;
                const chips = (month.byDay[index] ?? []).slice(0, 2);
                return (
                  <Column key={day.toISOString()} spacing={2}>
                    <Button
                      variant={index === view.todayIndex ? "filled" : "text"}
                      label={inMonth ? String(day.getDate()) : "·"}
                      onPress={() => onOpenDay(day)}
                    />
                    {chips.map((chip) => (
                      <Button
                        key={chip.id}
                        variant="outlined"
                        label={chip.title || "Untitled"}
                        onPress={() => onOpenEvent(chip)}
                      />
                    ))}
                  </Column>
                );
              })}
            </Row>
          ))}
        </Column>
      </ScrollView>
    </Host>
  );
}
