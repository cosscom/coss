import React from "react";

// Minimal next-themes mock for Storybook
export function useTheme() {
  return {
    theme: "light",
    setTheme: (_theme: string) => {},
    resolvedTheme: "light",
    themes: ["light", "dark"],
    systemTheme: "light" as const,
    forcedTheme: undefined,
  };
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  [key: string]: unknown;
}) {
  return React.createElement(React.Fragment, null, children);
}
