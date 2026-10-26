import * as Haptics from "expo-haptics";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { Tone } from "../lib/theme";
import { colors, radius } from "../lib/theme";
import { StatusDot } from "./badge";
import { Text } from "./text";

export type TabItem<T extends string> = {
  value: T;
  label: string;
  count?: number | string;
  tone?: Tone;
};

/** The dashboard's underlined tabs (an email's Content / Events / Recipients…). */
export function Tabs<T extends string>(props: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.tabs}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsBar}
    >
      {props.items.map((item) => {
        const selected = item.value === props.value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={item.value}
            onPress={() => {
              void Haptics.selectionAsync();
              props.onChange(item.value);
            }}
            style={[styles.tab, selected && styles.tabSelected]}
          >
            <Text muted={!selected} variant="label">
              {item.label}
            </Text>
            {item.count !== undefined ? (
              <Text muted variant="mono">
                {item.count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** The sidebar's environment switcher: a segmented control on the muted track. */
export function Segmented<T extends string>(props: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.track}>
      {props.items.map((item) => {
        const selected = item.value === props.value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={item.value}
            onPress={() => {
              if (selected) return;
              void Haptics.selectionAsync();
              props.onChange(item.value);
            }}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            {item.tone ? <StatusDot tone={item.tone} /> : null}
            <Text
              muted={!selected}
              numberOfLines={1}
              style={styles.segmentLabel}
              variant="smallMedium"
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabsBar: {
    flexGrow: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tabs: { gap: 20, paddingHorizontal: 2 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -StyleSheet.hairlineWidth,
  },
  tabSelected: { borderBottomColor: colors.foreground },
  track: {
    flexDirection: "row",
    padding: 3,
    borderRadius: radius.lg,
    backgroundColor: colors.muted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: radius.md,
  },
  segmentLabel: { flexShrink: 1 },
  segmentSelected: {
    backgroundColor: colors.card,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
});
