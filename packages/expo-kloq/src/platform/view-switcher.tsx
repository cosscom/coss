import { Platform } from "react-native";
import { SegmentedViews as AndroidViews } from "./view-switcher-android.tsx";
import { SegmentedViews as IosViews, type ViewOption } from "./view-switcher-ios.tsx";

export type { ViewOption };

/**
 * The view switch. iOS renders a SwiftUI segmented picker. Android renders a
 * Material segmented button. Other platforms use the Material row, which is
 * implemented in JS on web by @expo/ui.
 */
export function SegmentedViews(props: {
  options: readonly ViewOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  if (Platform.OS === "ios") return <IosViews {...props} />;
  return <AndroidViews {...props} />;
}
