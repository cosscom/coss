import { Button, Column, Host, Row, ScrollView, Spacer, Text } from "@expo/ui";
import { useMemo } from "react";
import { useKloqSettings } from "../settings-context.tsx";
import { buildYearGrid, type DayLoad, toDateOnlyString, type ViewDescriptor } from "../shared.ts";

export interface YearViewProps {
  view: ViewDescriptor;
  weekStartsOn: number;
  density: ReadonlyMap<string, DayLoad>;
  onOpenDay: (date: Date) => void;
  onOpenMonth: (month: Date) => void;
}

/** Twelve mini-months. A filled button means the day has something on it. */
export function YearView({ view, weekStartsOn, density, onOpenDay, onOpenMonth }: YearViewProps) {
  const settings = useKloqSettings();
  const year = view.year?.getFullYear() ?? view.days[0]?.getFullYear();
  const months = useMemo(
    () => (year === undefined ? [] : buildYearGrid(year, weekStartsOn)),
    [year, weekStartsOn],
  );
  return (
    <Host style={{ flex: 1 }}>
      <ScrollView>
        <Column spacing={12}>
          {months.map((month) => (
            <Column key={month.index} spacing={4}>
              <Button
                variant="text"
                label={month.first.toLocaleDateString(settings.locale, { month: "long" })}
                onPress={() => onOpenMonth(month.first)}
              />
              {month.weeks.map((week) => {
                const weekKey = week
                  .map((cell) => (cell ? toDateOnlyString(cell) : "pad"))
                  .join(".");
                let pads = 0;
                return (
                  <Row key={weekKey} spacing={2}>
                    {week.map((cell) => {
                      if (!cell) {
                        pads += 1;
                        return <Spacer key={`${weekKey}-${pads}`} size={28} />;
                      }
                      const load = density.get(toDateOnlyString(cell));
                      return (
                        <Button
                          key={cell.toISOString()}
                          variant={load && load.bucket > 0 ? "filled" : "text"}
                          label={String(cell.getDate())}
                          onPress={() => onOpenDay(cell)}
                        />
                      );
                    })}
                  </Row>
                );
              })}
            </Column>
          ))}
          {months.length === 0 ? <Text>No year</Text> : null}
        </Column>
      </ScrollView>
    </Host>
  );
}
