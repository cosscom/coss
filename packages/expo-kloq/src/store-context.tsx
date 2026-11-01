import { createContext, useContext } from "react";
import type { KloqStore } from "./shared.ts";

const StoreContext = createContext<KloqStore | null>(null);

export const StoreProvider = StoreContext.Provider;

/** The calendar's commit surface. Throws outside `<Kloq>`. */
export function useKloqStore(): KloqStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useKloqStore must be used inside <Kloq>");
  return store;
}
