"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

interface DebugContextValue {
  isLoadingOverride: boolean | null;
  setIsLoadingOverride: (value: boolean | null) => void;
}

const DebugContext = createContext<DebugContextValue | null>(null);

export function DebugProvider({ children }: { children: ReactNode }) {
  const [isLoadingOverride, setIsLoadingOverride] = useState<boolean | null>(
    null,
  );

  return (
    <DebugContext.Provider value={{ isLoadingOverride, setIsLoadingOverride }}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error("useDebug must be used within a DebugProvider");
  }
  return context;
}
