import { createContext, useContext } from "react";
import type { Keymap, KloqView, StepDirection, ViewDescriptor } from "./shared.ts";

/** Live view state. The shape matches kloq's `KloqChrome`. */
export interface KloqChrome {
  view: ViewDescriptor;
  viewSetting: KloqView;
  collapsed?: boolean;
  narrow?: boolean;
  ready?: boolean;
  timeline?: boolean;
  /** Quick add is available. */
  canCommand?: boolean;
  scheme?: "light" | "dark";
  fits?: (view: KloqView) => boolean;
  date: Date;
  atToday: boolean;
  lastStep: StepDirection | null;
  step: (dir: StepDirection) => void;
  goToday: () => void;
  switchView: (view: KloqView) => void;
  jumpToDay: (date: Date) => void;
  goToDate: (date: Date) => void;
  reset: () => void;
  /** Opens quick add. A no-op when `commandPalette` is false. */
  openCommand: () => void;
  /** Opens a short note: hardware shortcuts are not installed. */
  openShortcuts: () => void;
  undo: () => void;
  redo: () => void;
  keymap?: Keymap;
}

const ChromeContext = createContext<KloqChrome | null>(null);

export const ChromeProvider = ChromeContext.Provider;

/** Throws outside `<Kloq>`. */
export function useKloq(): KloqChrome {
  const chrome = useContext(ChromeContext);
  if (!chrome) throw new Error("useKloq must be used inside <Kloq> (as a child of it)");
  return chrome;
}
