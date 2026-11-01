import { Platform } from "react-native";
import { NativeDateField as AndroidDate } from "./date-field-android.tsx";
import { NativeDateField as IosDate } from "./date-field-ios.tsx";

export function NativeDateField(props: {
  value: Date;
  onChange: (date: Date) => void;
  mode: "date" | "time";
  title: string;
}) {
  if (Platform.OS === "ios") return <IosDate {...props} />;
  return <AndroidDate {...props} />;
}
