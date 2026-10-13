import localFont from "next/font/local";

/**
 * Cal Sans (https://github.com/calcom/sans, SIL OFL 1.1, licence in OFL.txt): Cal.com's geometric
 * sans, for headlines. The `calsans-cossui` build of v2.010 (commit 706884a): the full variable
 * font without its stylistic sets, with `opsz` peaking at 32 so headlines get the display drawing
 * sooner. Axes: `wght` 400–700, `opsz` 8–32 (automatic), `GEOM` 0–100 (UI 25 by default, Base 50,
 * Geo 100), `YTAS`, `SHRP`. Upright only; the body text stays each app's sans.
 *
 * Apply `fontCalSans.variable` on an ancestor and use `var(--font-cal-sans)`.
 */
export const fontCalSans = localFont({
  display: "swap",
  src: "./CalSansVF.woff2",
  variable: "--font-cal-sans",
  weight: "400 700",
});
