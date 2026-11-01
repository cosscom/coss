import type { EventColor } from "../../kloq/src/lib/calendar-types.ts";

/**
 * Tailwind 500 / 400 hexes matching `EVENT_COLORS` in kloq (`solid` is a CSS
 * variable there). Native views have no theme stylesheet, so the blocks paint
 * these directly.
 */
export const EVENT_SOLID: Record<EventColor, { light: string; dark: string }> = {
  blue: { light: "#3b82f6", dark: "#60a5fa" },
  violet: { light: "#8b5cf6", dark: "#a78bfa" },
  emerald: { light: "#10b981", dark: "#34d399" },
  amber: { light: "#f59e0b", dark: "#fbbf24" },
  rose: { light: "#f43f5e", dark: "#fb7185" },
};

export interface Ink {
  text: string;
  muted: string;
  line: string;
  canvas: string;
  wash: string;
  shade: string;
}

export function inkFor(scheme: "light" | "dark"): Ink {
  if (scheme === "dark") {
    return {
      text: "#fafafa",
      muted: "#a1a1aa",
      line: "#3f3f46",
      canvas: "#09090b",
      wash: "rgba(255,255,255,0.04)",
      shade: "rgba(255,255,255,0.08)",
    };
  }
  return {
    text: "#18181b",
    muted: "#71717a",
    line: "#e4e4e7",
    canvas: "#ffffff",
    wash: "rgba(0,0,0,0.03)",
    shade: "rgba(0,0,0,0.06)",
  };
}

export function eventSolid(color: EventColor, scheme: "light" | "dark"): string {
  return EVENT_SOLID[color][scheme];
}
