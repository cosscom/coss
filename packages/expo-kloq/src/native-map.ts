/**
 * Which native control each kloq surface uses. The README's mapping table is
 * this list. `fallback` is set only where @expo/ui has no equivalent.
 */
export interface NativeMapping {
  kloq: string;
  expoKloq: string;
  native: string;
  fallback?: string;
}

export const NATIVE_MAP: readonly NativeMapping[] = [
  {
    kloq: "Kloq / KloqToolbar / KloqNav / KloqReset",
    expoKloq: "Kloq, KloqToolbar, KloqNav, KloqReset",
    native:
      "@expo/ui Host, Row, Column, Button, Text, Picker. iOS toolbar is wrapped in expo-glass-effect GlassView (Liquid Glass on iOS 26, plain View otherwise).",
  },
  {
    kloq: "Week grid / day grid / EventBlock / TimeGutter / NowIndicator",
    expoKloq: "Time grid inside Kloq",
    native:
      "@expo/ui RNHostView hosts the canvas so the surrounding chrome stays SwiftUI or Compose.",
    fallback:
      "Absolutely positioned React Native Views. Neither SwiftUI nor Compose is exposed by @expo/ui as a free-form hour canvas with overlap columns.",
  },
  {
    kloq: "Month view",
    expoKloq: "Month grid inside Kloq",
    native: "@expo/ui Column, Row, Button, Text, ScrollView.",
  },
  {
    kloq: "Agenda view",
    expoKloq: "Agenda list inside Kloq",
    native: "@expo/ui List and ListItem (SwiftUI List / Compose LazyColumn).",
  },
  {
    kloq: "YearView",
    expoKloq: "YearView",
    native: "@expo/ui ScrollView, Column, Row, Button. Density picks the button variant.",
  },
  {
    kloq: "TimelineGrid",
    expoKloq: "TimelineGrid",
    native: "@expo/ui List, ListItem, Row, Button.",
  },
  {
    kloq: "CalendarField",
    expoKloq: "CalendarField",
    native: "@expo/ui Picker (UIMenu on iOS, Material menu on Android).",
  },
  {
    kloq: "CalendarList",
    expoKloq: "CalendarList",
    native: "@expo/ui List, ListItem, Switch, Button.",
  },
  {
    kloq: "QuickAddInput",
    expoKloq: "QuickAddInput",
    native: "@expo/ui TextInput (SwiftUI TextField / Compose TextField) plus Text preview.",
  },
  {
    kloq: "MoveToInput",
    expoKloq: "MoveToInput",
    native: "@expo/ui TextInput plus Text preview.",
  },
  {
    kloq: "RRuleBuilder",
    expoKloq: "RRuleBuilder",
    native: "@expo/ui Picker and Button.",
  },
  {
    kloq: "ReminderField",
    expoKloq: "ReminderField",
    native: "@expo/ui Picker, List, Button.",
  },
  {
    kloq: "RecurrenceScopeDialog",
    expoKloq: "RecurrenceScopeDialog",
    native:
      "iOS: @expo/ui/swift-ui ConfirmationDialog. Android: @expo/ui BottomSheet (Compose ModalBottomSheet). Material AlertDialog only has confirm and dismiss slots, so three scopes use a sheet.",
  },
  {
    kloq: "Event panel",
    expoKloq: "Event sheet inside Kloq",
    native:
      "@expo/ui BottomSheet, TextInput, Switch, Picker. Dates use @expo/ui/swift-ui DatePicker on iOS and @expo/ui/jetpack-compose DateTimePicker on Android.",
  },
  {
    kloq: "MultiTimeZoneGutter",
    expoKloq: "MultiTimeZoneGutter",
    native: "@expo/ui Row and Text for the zone summary.",
    fallback: "Per-hour columns scroll with the time grid, which is the React Native canvas above.",
  },
  {
    kloq: "Design mode, ⌘K command palette, keyboard shortcuts, drag-to-move and resize",
    expoKloq: "Not a separate component",
    native: "Quick add opens in a BottomSheet. Editing a time uses the native date picker.",
    fallback:
      "Pointer-drag physics, marquee selection, design mode and hardware shortcuts have no native equivalent here and are not reimplemented.",
  },
];
