import type { LucideIcon } from "lucide-react-native";
import { type ColorToken, usePalette } from "../lib/theme";

/** A lucide icon (the dashboard's set) in a theme color: SVG needs a plain one. */
export function Icon(props: {
  icon: LucideIcon;
  color?: ColorToken;
  size?: number;
  strokeWidth?: number;
}) {
  const palette = usePalette();
  const Glyph = props.icon;
  return (
    <Glyph
      color={palette[props.color ?? "foreground"]}
      size={props.size ?? 16}
      strokeWidth={props.strokeWidth ?? 1.75}
    />
  );
}
