"use client";

/**
 * Settings, wired in consumer-land.
 *
 * The dialog stores nothing — it's a `value`/`onChange` pair — so this is
 * where preferences actually live: one `useState`, one localStorage key, and
 * a mapping from each preference onto the `<Kloq>` prop that implements it.
 *
 * That mapping is the interesting part, and it's deliberately incomplete:
 * `showWeekends` and `weekStartsOn` and `language` have props today,
 * `showWeekNumbers` and `showDeclinedEvents` do not. Rather than hide that,
 * {@link preferencesToKloqProps} returns exactly what exists and the rest is
 * reported upward. A settings screen that renders a switch with nothing
 * behind it is worse than one that doesn't render it.
 */

import { toastManager } from "@coss/ui/components/toast";
import { type KloqView, registerCommands } from "kloq";
import {
  DEFAULT_PREFERENCES,
  disconnectAccount,
  type KloqPreferences,
  SettingsDialog,
} from "kloq/settings";
import * as React from "react";

const STORAGE_KEY = "kloq-demo-preferences";

/** Read the persisted preferences, or the defaults. Never throws. */
export function loadPreferences(): KloqPreferences {
  if (typeof localStorage === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    // spread over the defaults so a preference added later doesn't come back
    // `undefined` and render a switch in neither state
    return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as object) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/** Persist preferences. Never throws — private-mode storage failures are
    not worth interrupting anyone over; the session still works. */
export function savePreferences(next: KloqPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // see above
  }
}

/**
 * The half of the preferences `<Kloq>` can act on today.
 *
 * - `showWeekends` → a 5-day view instead of a 7-day one. The component has
 *   no "hide weekends" flag; an n-day view is the same thing said in the
 *   vocabulary it already has.
 * - `weekStartsOn` → the prop of the same name.
 * - `language` → `locale`, which drives every date and time label.
 *
 * Not mapped, because there is no prop: `showWeekNumbers`,
 * `showDeclinedEvents`, `navigationKeys`, and everything under Notifications.
 */
export function preferencesToKloqProps(prefs: KloqPreferences): {
  view: KloqView;
  weekStartsOn: number;
  locale: string | undefined;
} {
  return {
    view: prefs.showWeekends ? "week" : 5,
    weekStartsOn: prefs.weekStartsOn,
    locale: prefs.language || undefined,
  };
}

export interface SettingsDemoProps {
  value: KloqPreferences;
  onChange: (next: KloqPreferences) => void;
}

export function SettingsDemo({ value, onChange }: SettingsDemoProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);

  React.useEffect(
    () =>
      registerCommands({
        id: "demo:settings",
        label: "Open settings…",
        keywords: "preferences accounts conferencing notifications weekends",
        group: "Demo",
        run: () => setOpen(true),
      }),
    [],
  );

  const change = React.useCallback(
    (next: KloqPreferences) => {
      onChange(next);
      savePreferences(next);
    },
    [onChange],
  );

  return (
    <SettingsDialog
      open={open}
      onOpenChange={setOpen}
      value={value}
      onChange={change}
      onAddAccount={() =>
        toastManager.add({
          title: "Mock accounts only",
          description:
            "kloq never owns Google/Outlook/CalDAV auth — a host registers what it connected through registerCalendarSources().",
        })
      }
      onDisconnectAccount={(id) => {
        /*
         * Omitting this prop would let `CalendarList` drop the account from
         * the registry on its own, which is the right default for a mock.
         * It's implemented here to show the shape a real integration needs:
         * revoke the token FIRST, and only then drop the local registration —
         * the reverse order leaves a connected account nobody can see.
         */
        const removed = disconnectAccount(id);
        toastManager.add({
          title: `Disconnected ${id}`,
          description: `${removed.length} calendar${removed.length === 1 ? "" : "s"} removed. A real integration revokes the OAuth token first; reload to get the mocks back.`,
        });
      }}
    />
  );
}
