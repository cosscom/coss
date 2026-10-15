import * as Haptics from "expo-haptics";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { colors, radius, type Tone } from "../lib/theme";
import { StatusDot } from "./badge";
import { Text } from "./text";

export type Filter<T extends string> = { value: T | null; label: string; tone?: Tone };

/** The dashboard's filter links, as a scrolling row of chips. */
export function FilterChips<T extends string>(props: {
  items: Filter<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.row}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {props.items.map((item) => {
        const selected = item.value === props.value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={item.value ?? "all"}
            onPress={() => {
              void Haptics.selectionAsync();
              props.onChange(item.value);
            }}
            style={[styles.chip, selected && styles.selected]}
          >
            {item.tone ? <StatusDot tone={item.tone} /> : null}
            <Text style={selected && { color: colors.primaryForeground }} variant="smallMedium">
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.input,
    backgroundColor: colors.background,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
});
