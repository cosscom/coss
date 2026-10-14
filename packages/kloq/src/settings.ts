/**
 * `kloq/settings` — the settings dialog and its preferences model.
 * An optional subpath; nothing here stores anything.
 */

export { SegmentedChoice } from "./calendar/calendar-list";
export {
  DEFAULT_PREFERENCES,
  type KloqPreferences,
  LANGUAGE_OPTIONS,
  type NavigationKeys,
  SettingsDialog,
  type SettingsDialogProps,
  type SettingsSection,
  type WeekStart,
} from "./calendar/settings-dialog";
/* accounts */
export {
  accountDefaultCalendar,
  CONFERENCING_PROVIDERS,
  type ConferencingProvider,
  conferencingLabel,
  defaultAccount,
  disconnectAccount,
  findAccount,
  providerLabel,
  resolveDefaultCalendar,
  setAccountConferencing,
  setAccountDefaultCalendar,
  setDefaultAccount,
} from "./lib/calendar-sources";
