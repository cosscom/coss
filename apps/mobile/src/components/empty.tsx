import type { LucideIcon } from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { StyleSheet, View } from "react-native";
import { colors, radius } from "../lib/theme";
import { Icon } from "./icon";
import { Text } from "./text";

const SPACING = 24;

function dots(columns: number, rows: number): { x: number; y: number }[] {
  const points = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) points.push({ x, y });
  return points;
}

/** `.drafting-grid`: coss.com's dot grid, behind empty states and the sign-in panel. */
export function DraftingGrid() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const columns = Math.floor(size.width / SPACING);
  const rows = Math.floor(size.height / SPACING);
  const offsetX = (size.width - (columns - 1) * SPACING) / 2;
  const offsetY = (size.height - (rows - 1) * SPACING) / 2;
  return (
    <View
      onLayout={(event) => setSize(event.nativeEvent.layout)}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      {dots(columns, rows).map(({ x, y }) => (
        <View
          key={`${x}:${y}`}
          style={[styles.dot, { left: offsetX + x * SPACING - 1, top: offsetY + y * SPACING - 1 }]}
        />
      ))}
    </View>
  );
}

/** Nothing to show yet: an icon tile on the drafting grid, a title, what would appear here. */
export function EmptyState(props: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <DraftingGrid />
      <View style={styles.tile}>
        <Icon icon={props.icon} size={20} />
      </View>
      <Text style={styles.center} variant="heading">
        {props.title}
      </Text>
      {props.description ? (
        <Text muted style={styles.center} variant="small">
          {props.description}
        </Text>
      ) : null}
      {props.action ? <View style={styles.action}>{props.action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: "absolute",
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.grid,
  },
  empty: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 40,
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  center: { textAlign: "center", maxWidth: 300 },
  action: { marginTop: 10 },
});
