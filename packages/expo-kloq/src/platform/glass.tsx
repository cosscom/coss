import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { Platform, View, type ViewStyle } from "react-native";

/** Liquid Glass on iOS 26. Every other platform gets a plain view — GlassView's own fallback crashes on some iOS 26 betas, so the check runs first. */
export function GlassBar({
  children,
  scheme,
  style,
}: {
  children: ReactNode;
  scheme?: "light" | "dark";
  style?: ViewStyle;
}) {
  const glass = Platform.OS === "ios" && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  if (!glass) return <View style={style}>{children}</View>;
  return (
    <GlassView
      style={style}
      glassEffectStyle="regular"
      colorScheme={scheme ?? "auto"}
      isInteractive
    >
      {children}
    </GlassView>
  );
}
