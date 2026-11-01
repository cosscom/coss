import type { ViewStyle } from "react-native";
import type {
  CalEvent,
  CalendarSource,
  Keymap,
  KloqConfig,
  KloqConstraints,
  KloqView,
  Lane,
  LaneAdapter,
  NavigationKeys,
  OnCommit,
  PersistenceAdapter,
  ResponsiveSetting,
  StorageSetting,
  TimelineWindowConfig,
} from "./shared.ts";
import type { KloqComponents } from "./slots.ts";
import type { WorkingHours } from "./working-hours.ts";

/**
 * Host input. Field names match `<Kloq>` in the React package wherever the
 * behaviour exists on a phone. Web-only fields are accepted and ignored so a
 * shared props object still typechecks; the README lists those.
 */
export interface KloqProps extends KloqConfig {
  children?: React.ReactNode;
  /** Native stand-in for kloq's `className`. */
  style?: ViewStyle;
  /** Accepted for API compatibility. Native paint follows `scheme`, not CSS themes. */
  theme?: string;
  scheme?: "light" | "dark";
  view?: KloqView;
  defaultView?: KloqView;
  onViewChange?: (view: KloqView) => void;
  components?: Partial<KloqComponents>;
  weekStartsOn?: number;
  date?: Date;
  defaultDate?: Date;
  onDateChange?: (date: Date) => void;
  onRangeChange?: (start: Date, end: Date) => void;
  rangePadding?: number | { before: number; after: number };
  events?: CalEvent[];
  onEventsChange?: (events: CalEvent[]) => void;
  defaultEvents?: CalEvent[];
  persistence?: false | PersistenceAdapter;
  /**
   * Accepted for compatibility. The web package writes localStorage here;
   * native keeps memory unless you pass `persistence`.
   */
  storage?: StorageSetting;
  onCommit?: OnCommit;
  /** Accepted and ignored. Design mode is a web overlay. */
  designMode?: boolean | { hint?: boolean };
  /** `false` hides quick add. There is no ⌘K binding on native. */
  commandPalette?: boolean | { commands?: readonly string[] };
  workingHours?: WorkingHours | false;
  constraints?: KloqConstraints;
  onUndo?: () => void;
  onRedo?: () => void;
  responsive?: ResponsiveSetting;
  onEventClick?: (event: CalEvent, placementId: string) => void;
  onEventDoubleClick?: (event: CalEvent, placementId: string) => void;
  onSlotClick?: (slot: { start: Date; end: Date; allDay: boolean }) => void;
  onSelectionChange?: (events: CalEvent[]) => void;
  /** Accepted and ignored. Hardware shortcuts are not installed. */
  globalShortcuts?: boolean;
  currentUserEmail?: string;
  showWeekNumbers?: boolean;
  showDeclinedEvents?: boolean;
  /** Accepted and ignored. */
  navigationKeys?: NavigationKeys;
  onTimeZonesClick?: () => void;
  /** Accepted and ignored. */
  keymap?: Keymap;
  /** Accepted and ignored. */
  onCustomizeKeybinds?: () => void;
  /** Accepted and ignored. There is no server render. */
  ssr?: boolean;
  lanes?: readonly Lane[];
  laneAdapter?: LaneAdapter;
  timelineWindow?: TimelineWindowConfig;
  /** Calendars offered to the event sheet. Omit to read kloq's registry. */
  sources?: readonly CalendarSource[];
}

export type { WorkingHours } from "./working-hours.ts";
