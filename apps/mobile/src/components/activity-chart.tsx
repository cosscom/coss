import type { EnvironmentResponse } from "@coss/companion";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { formatCount, formatDay } from "../lib/format";
import { type ColorToken, colors } from "../lib/theme";
import { Text } from "./text";

type Day = EnvironmentResponse["activity"]["days"][number];

const SERIES: { key: string; label: string; color: ColorToken; value: (day: Day) => number }[] = [
  { key: "sent", label: "Sent", color: "chartSent", value: (day) => day.sent },
  { key: "failed", label: "Failed", color: "destructive", value: (day) => day.failed },
  {
    key: "pending",
    label: "Queued or scheduled",
    color: "chartPending",
    value: (day) => day.queued + day.scheduled,
  },
  { key: "canceled", label: "Canceled", color: "chartCanceled", value: (day) => day.canceled },
];

const DASHES = Array.from({ length: 64 }, (_, n) => `dash-${n}`);

/** A dashed rule (React Native draws no dashed borders on one side). */
function Dashes() {
  return (
    <View style={styles.dashes}>
      {DASHES.map((key) => (
        <View key={key} style={styles.dash} />
      ))}
    </View>
  );
}

/** The dashboard's stacked daily bars: tap a day for its numbers (the web shows them on hover). */
export function ActivityChart({ days }: { days: Day[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const totals = days.map((day) => SERIES.reduce((sum, series) => sum + series.value(day), 0));
  const max = Math.max(1, ...totals);
  const focus = selected === null ? null : days[selected];

  return (
    <View style={styles.chart}>
      <View style={styles.legend}>
        {focus ? (
          <>
            <Text variant="mono">{formatDay(focus.date)}</Text>
            {SERIES.map((series) => (
              <View key={series.key} style={styles.legendItem}>
                <View style={[styles.swatch, { backgroundColor: colors[series.color] }]} />
                <Text muted variant="mono">
                  {formatCount(series.value(focus))}
                </Text>
              </View>
            ))}
          </>
        ) : (
          SERIES.map((series) => (
            <View key={series.key} style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: colors[series.color] }]} />
              <Text muted style={styles.legendLabel} variant="small">
                {series.label}
              </Text>
            </View>
          ))
        )}
      </View>
      <View>
        <Dashes />
        <View style={styles.plot}>
          {days.map((day, index) => (
            <Pressable
              accessibilityLabel={`${formatDay(day.date)}: ${totals[index]} emails`}
              key={day.date}
              onPress={() => {
                void Haptics.selectionAsync();
                setSelected(selected === index ? null : index);
              }}
              style={[styles.column, selected !== null && selected !== index && styles.dimmed]}
            >
              {totals[index] === 0 ? (
                <View style={styles.empty} />
              ) : (
                SERIES.map((series, position) => {
                  const value = series.value(day);
                  if (value === 0) return null;
                  const top = SERIES.slice(position + 1).every((above) => above.value(day) === 0);
                  return (
                    <View
                      key={series.key}
                      style={[
                        styles.segment,
                        position === 0 && styles.bottom,
                        top && styles.top,
                        {
                          height: `${(value / max) * 100}%`,
                          backgroundColor: colors[series.color],
                        },
                      ]}
                    />
                  );
                })
              )}
            </Pressable>
          ))}
        </View>
        <Dashes />
      </View>
      <View style={styles.axis}>
        <Text muted style={styles.axisLabel} variant="mono">
          {days[0] ? formatDay(days[0].date) : ""}
        </Text>
        <Text muted style={styles.axisLabel} variant="mono">
          max {formatCount(max)}
        </Text>
        <Text muted style={styles.axisLabel} variant="mono">
          {days.at(-1) ? formatDay(days.at(-1)?.date ?? "") : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { gap: 12 },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 12,
    rowGap: 4,
    minHeight: 18,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendLabel: { fontSize: 12 },
  swatch: { width: 8, height: 8, borderRadius: 2 },
  plot: { height: 128, flexDirection: "row", alignItems: "flex-end", gap: 3, paddingTop: 1 },
  dashes: { flexDirection: "row", gap: 3, overflow: "hidden", height: 1 },
  dash: { width: 4, height: 1, backgroundColor: colors.border },
  column: { flex: 1, height: "100%", flexDirection: "column-reverse" },
  dimmed: { opacity: 0.4 },
  segment: { minHeight: 2 },
  bottom: { borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  top: { borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  empty: { height: 2, borderRadius: 1, backgroundColor: colors.chartEmpty },
  axis: { flexDirection: "row", justifyContent: "space-between" },
  axisLabel: { fontSize: 11 },
});
