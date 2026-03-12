"use client";

import type * as React from "react";
import type { Context } from "react";
import { createContext, type ReactNode, useContext, useState } from "react";

interface DebugContextValue {
  enableArtificialDelay: boolean;
  isLoadingOverride: boolean | null;
  setEnableArtificialDelay: (value: boolean) => void;
  setIsLoadingOverride: (value: boolean | null) => void;
}

const DebugContext: Context<DebugContextValue | null> =
  createContext<DebugContextValue | null>(null);

export function DebugProvider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const [isLoadingOverride, setIsLoadingOverride] = useState<boolean | null>(
    null,
  );
  const [enableArtificialDelay, setEnableArtificialDelay] = useState(false);

  return (
    <DebugContext.Provider
      value={{
        enableArtificialDelay,
        isLoadingOverride,
        setEnableArtificialDelay,
        setIsLoadingOverride,
      }}
    >
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug(): DebugContextValue {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error("useDebug must be used within a DebugProvider");
  }
  return context;
}
