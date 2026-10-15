import { DynamicColorIOS, type OpaqueColorValue, useColorScheme } from "react-native";

// coss ui's tokens (packages/ui/src/styles/theme.css), resolved to sRGB for light and `.dark`.
const light = {
  background: "#ffffff",
  foreground: "#262626",
  card: "#ffffff",
  /** The muted tray a panel's header and footer sit on (`bg-muted/72` over the card). */
  tray: "#f6f6f6",
  muted: "rgba(0,0,0,0.04)",
  mutedForeground: "#686868",
  border: "rgba(0,0,0,0.08)",
  input: "rgba(0,0,0,0.10)",
  primary: "#262626",
  primaryForeground: "#fafafa",
  sidebar: "#fafafa",
  /** `.drafting-grid` dots: the foreground at 16%. */
  grid: "rgba(38,38,38,0.16)",
  chartSent: "rgba(38,38,38,0.72)",
  chartPending: "rgba(59,130,246,0.64)",
  chartCanceled: "rgba(104,104,104,0.32)",
  chartEmpty: "rgba(104,104,104,0.16)",
  success: "#10b981",
  successForeground: "#047857",
  successTint: "rgba(16,185,129,0.08)",
  successBorder: "rgba(16,185,129,0.32)",
  warning: "#f59e0b",
  warningForeground: "#b45309",
  warningTint: "rgba(245,158,11,0.08)",
  warningBorder: "rgba(245,158,11,0.32)",
  destructive: "#ef4444",
  destructiveForeground: "#b91c1c",
  destructiveTint: "rgba(239,68,68,0.06)",
  destructiveBorder: "rgba(239,68,68,0.32)",
  info: "#3b82f6",
  infoForeground: "#1d4ed8",
  infoTint: "rgba(59,130,246,0.08)",
  infoBorder: "rgba(59,130,246,0.32)",
};

type Palette = typeof light;

const dark: Palette = {
  background: "#161616",
  foreground: "#f5f5f5",
  card: "#1b1b1b",
  tray: "#1f1f1f",
  muted: "rgba(255,255,255,0.04)",
  mutedForeground: "#818181",
  border: "rgba(255,255,255,0.06)",
  input: "rgba(255,255,255,0.08)",
  primary: "#f5f5f5",
  primaryForeground: "#262626",
  sidebar: "#111111",
  grid: "rgba(245,245,245,0.16)",
  chartSent: "rgba(245,245,245,0.72)",
  chartPending: "rgba(59,130,246,0.64)",
  chartCanceled: "rgba(129,129,129,0.32)",
  chartEmpty: "rgba(129,129,129,0.16)",
  success: "#10b981",
  successForeground: "#34d399",
  successTint: "rgba(16,185,129,0.16)",
  successBorder: "rgba(16,185,129,0.32)",
  warning: "#f59e0b",
  warningForeground: "#fbbf24",
  warningTint: "rgba(245,158,11,0.16)",
  warningBorder: "rgba(245,158,11,0.32)",
  destructive: "#f15757",
  destructiveForeground: "#f87171",
  destructiveTint: "rgba(239,68,68,0.12)",
  destructiveBorder: "rgba(239,68,68,0.32)",
  info: "#3b82f6",
  infoForeground: "#60a5fa",
  infoTint: "rgba(59,130,246,0.16)",
  infoBorder: "rgba(59,130,246,0.32)",
};

export type ColorToken = keyof Palette;

/** Native dynamic colors for styles: they follow the system appearance without re-rendering. */
export const colors = Object.fromEntries(
  Object.keys(light).map((key) => [
    key,
    DynamicColorIOS({ light: light[key as ColorToken], dark: dark[key as ColorToken] }),
  ]),
) as Record<ColorToken, OpaqueColorValue>;

/** Plain colors for what can't take a dynamic one (SVG icons, the status bar). */
export function usePalette(): Palette {
  return useColorScheme() === "dark" ? dark : light;
}

export type Tone = "success" | "warning" | "error" | "info" | "neutral";

export const TONE_TOKENS: Record<
  Tone,
  { dot: ColorToken; text: ColorToken; tint: ColorToken; border: ColorToken }
> = {
  success: {
    dot: "success",
    text: "successForeground",
    tint: "successTint",
    border: "successBorder",
  },
  warning: {
    dot: "warning",
    text: "warningForeground",
    tint: "warningTint",
    border: "warningBorder",
  },
  error: {
    dot: "destructive",
    text: "destructiveForeground",
    tint: "destructiveTint",
    border: "destructiveBorder",
  },
  info: { dot: "info", text: "infoForeground", tint: "infoTint", border: "infoBorder" },
  neutral: { dot: "mutedForeground", text: "foreground", tint: "muted", border: "border" },
};

// Static instances cut from @coss/ui's Cal Sans and Paper Mono (scripts/build-fonts.py).
export const fonts = {
  regular: "CalSans-Regular",
  medium: "CalSans-Medium",
  semibold: "CalSans-SemiBold",
  display: "CalSans-Display",
  wordmark: "CalSans-Wordmark",
  mono: "PaperMono-Regular",
};

export const radius = { sm: 6, md: 8, lg: 10, xl: 14, frame: 16 };
