# expo-kloq

Expo and React Native build of [kloq](../kloq). The calendar model — events, views, recurrence, reminders, time zones, quick add — is kloq's. The controls are the platform's: SwiftUI on iOS and Jetpack Compose on Android, through [`@expo/ui`](https://docs.expo.dev/versions/v57.0.0/sdk/ui/).

License: AGPL-3.0-only, same as the rest of this repository. The logic it calls lives in `kloq`, which is MIT.

## Install

The package is a workspace (`packages/expo-kloq`) and is not published. From an Expo SDK 57 app in this repo:

```json
{
  "dependencies": {
    "expo-kloq": "workspace:*"
  }
}
```

Peers (install with `npx expo install` so the versions match the SDK):

- `expo` `^57`
- `@expo/ui` `^57`
- `expo-glass-effect` `^57`
- `react` `^19.2.3`
- `react-native` `^0.86`

```tsx
import { Kloq, KloqToolbar } from "expo-kloq";

export function Schedule() {
  return (
    <Kloq defaultView="week" weekStartsOn={1}>
      <KloqToolbar />
    </Kloq>
  );
}
```

`examples/App.tsx` is the same screen with kloq's sample week.

`<Kloq>` takes the same props as the React calendar wherever they mean something on a phone: `view`, `date`, `events`, `onEventsChange`, `onCommit`, `persistence`, `constraints`, `workingHours`, `lanes`, `timeZones`, and the rest of `KloqConfig`. Children are the toolbar, rendered above the surface, as on the web.

## What is native

| kloq | expo-kloq | Native control |
| --- | --- | --- |
| Toolbar, nav, reset | `KloqToolbar`, `KloqNav`, `KloqReset` | `@expo/ui` `Host`, `Row`, `Column`, `Button`, `Text`. The view switch is a SwiftUI segmented `Picker` on iOS and a Material 3 `SingleChoiceSegmentedButtonRow` on Android. On iOS 26 the bar sits in `expo-glass-effect`'s `GlassView` (Liquid Glass). Elsewhere `GlassView` is not mounted. |
| Month | month grid inside `Kloq` | `@expo/ui` `Button`s in `Row`s |
| Agenda | agenda inside `Kloq` | `@expo/ui` `List` / `ListItem` (SwiftUI `List`, Compose `LazyColumn`) |
| `YearView` | `YearView` | `@expo/ui` `ScrollView` and `Button`. A filled button is a day with events (`densityBucket`). |
| `TimelineGrid` | `TimelineGrid` | `@expo/ui` `List` and `Button` per lane |
| `CalendarField` | `CalendarField` | `@expo/ui` `Picker` |
| `CalendarList` | `CalendarList` | `@expo/ui` `List`, `Switch` |
| `QuickAddInput` | `QuickAddInput` | `@expo/ui` `TextInput` (SwiftUI `TextField` / Compose `TextField`). The preview is announced with `AccessibilityInfo`. |
| `MoveToInput` | `MoveToInput` | `@expo/ui` `TextInput` |
| `RRuleBuilder` | `RRuleBuilder` | `@expo/ui` `Picker` and `Button` |
| `ReminderField` | `ReminderField` | `@expo/ui` `Picker`, `List`, `Button` |
| `RecurrenceScopeDialog` | `RecurrenceScopeDialog` | iOS: `@expo/ui/swift-ui` `ConfirmationDialog`. Android: `@expo/ui` `BottomSheet` (Compose `ModalBottomSheet`). Material's `AlertDialog` only has confirm and dismiss slots, so three scopes use a sheet. |
| Event panel | sheet inside `Kloq` | `@expo/ui` `BottomSheet`. Dates are `@expo/ui/swift-ui` `DatePicker` on iOS and `@expo/ui/jetpack-compose` `DateTimePicker` on Android. |
| `MultiTimeZoneGutter` | `MultiTimeZoneGutter` | `@expo/ui` `Row` and `Text` for each zone's clock |

`useKloq()`, `useKloqSettings()`, and `useKloqStore()` match the web hooks. `useKloqStore()` is the commit surface (`add`, `update`, `remove`, `batch`, `get`, `reset`). Pass your own `PersistenceAdapter` (for example one that writes to a file). `localStorageAdapter` is re-exported for source compatibility and only works where `localStorage` exists.

## Fallbacks

These are the places `@expo/ui` has no equivalent, so the package uses React Native:

- **Day, week, and n-day hour canvas** (`TimeGrid`), including overlap columns, the hour gutter, the now line, and working-hours tint. The canvas is a React Native `View` inside `@expo/ui`'s `RNHostView`, so the toolbar and the all-day row stay native. Per-hour multi-zone columns scroll with that canvas; the zone summary above it is native text.
- **Custom slots** (`components.EventBlock` and the rest of `KloqComponents`) render as React Native views. The default blocks do too, because they sit on that canvas.
- **A custom `TimelineRow`** is hosted in `RNHostView`. The default timeline is the native list.

Not carried over, because they are web interactions rather than a missing widget:

- Drag-to-move, drag-to-resize, and marquee selection. Times are edited with the native date and time pickers. Tapping a free slot still creates, and `constraints` still refuse the slot.
- Design mode, CSS themes (`theme` is accepted and ignored; use `scheme`), and `className` (use `style`).
- Hardware shortcuts, the ⌘K command palette, and keymap rebinding. Quick add opens from **New** on the toolbar (`commandPalette={false}` hides it). `openShortcuts()` explains that.
- `storage` does not touch `localStorage`. Pass `persistence`.

`NATIVE_MAP` in `src/native-map.ts` is the same table, kept next to the code.

## Scripts

```sh
bun run --cwd packages/expo-kloq typecheck
bun run --cwd packages/expo-kloq test
bunx biome check packages/expo-kloq
```

Tests cover the shared model (projection, responsive collapse, constraints, declined events, all-day exclusive end, quick add, the commit reducer, zone clocks). They do not mount React Native.
