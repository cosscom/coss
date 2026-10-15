import * as Haptics from "expo-haptics";
import type { LucideIcon } from "lucide-react-native";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { type ColorToken, colors, radius, usePalette } from "../lib/theme";
import { Icon } from "./icon";
import { Text } from "./text";

type Variant = "default" | "outline" | "ghost" | "destructive-outline";

const FOREGROUND: Record<Variant, ColorToken> = {
  default: "primaryForeground",
  outline: "foreground",
  ghost: "foreground",
  "destructive-outline": "destructiveForeground",
};

/** coss ui's `Button`, at touch size. */
export function Button(props: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: LucideIcon;
  trailingIcon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  size?: "default" | "sm";
}) {
  const variant = props.variant ?? "default";
  const foreground = FOREGROUND[variant];
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: props.disabled, busy: props.loading }}
      disabled={props.disabled || props.loading}
      onPress={() => {
        void Haptics.selectionAsync();
        props.onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        props.size === "sm" && styles.small,
        styles[variant],
        pressed && (variant === "default" ? styles.pressedSolid : styles.pressed),
        props.disabled && styles.disabled,
      ]}
    >
      {props.loading ? (
        <ActivityIndicator color={palette[foreground]} />
      ) : (
        <View style={styles.content}>
          {props.icon ? <Icon color={foreground} icon={props.icon} strokeWidth={2} /> : null}
          <Text style={{ color: colors[foreground] }} variant="label">
            {props.title}
          </Text>
          {props.trailingIcon ? (
            <Icon color={foreground} icon={props.trailingIcon} strokeWidth={2} />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 46,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
  },
  small: { height: 34, paddingHorizontal: 12, borderRadius: radius.md },
  content: { flexDirection: "row", alignItems: "center", gap: 8 },
  default: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  outline: { backgroundColor: colors.background, borderColor: colors.input },
  ghost: {},
  "destructive-outline": { backgroundColor: colors.background, borderColor: colors.input },
  pressed: { backgroundColor: colors.muted },
  pressedSolid: { opacity: 0.88 },
  disabled: { opacity: 0.64 },
});
