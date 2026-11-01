import { createContext, useContext } from "react";
import type { KloqSettings } from "./shared.ts";

const SettingsContext = createContext<KloqSettings | null>(null);

export const SettingsProvider = SettingsContext.Provider;

/** The resolved geometry and formatters. Throws outside `<Kloq>`. */
export function useKloqSettings(): KloqSettings {
  const settings = useContext(SettingsContext);
  if (!settings) throw new Error("useKloqSettings must be used inside <Kloq>");
  return settings;
}
