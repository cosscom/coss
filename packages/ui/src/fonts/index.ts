import localFont from "next/font/local";

/**
 * Cal Sans (https://github.com/calcom/sans, SIL OFL 1.1, licence in OFL.txt): Cal.com's geometric
 * sans. The `calsans-cossui` build of v2.010 (commit 706884a): the full variable font without its
 * stylistic sets, with `opsz` peaking at 32 so headlines get the display drawing sooner. Axes:
 * `wght` 400–700, `opsz` 8–32 (automatic), `GEOM` 0–100 (UI 25 by default, Base 50, Geo 100),
 * `YTAS`, `SHRP`. The italic is the upstream build.
 *
 * `fontSans` is the coss ui sites' body and heading face (`--font-sans`, which `theme.css` also
 * maps to `--font-heading`); `fontCalSans` exposes the upright alone as `--font-cal-sans` for pages
 * that keep their own body sans (Shipyard's landing page).
 */
export const fontSans = localFont({
  display: "swap",
  src: [
    { path: "./CalSansVF.woff2", style: "normal" },
    { path: "./CalSansVF-Italic.woff2", style: "italic" },
  ],
  variable: "--font-sans",
  weight: "400 700",
});

/** Same variable font as `fontSans`; optional when wiring a separate `--font-heading`. */
export const fontHeading = fontSans;

export const fontCalSans = localFont({
  display: "swap",
  src: "./CalSansVF.woff2",
  variable: "--font-cal-sans",
  weight: "400 700",
});

/** Paper Mono: code and monospace UI (`--font-mono`). */
export const fontMono = localFont({
  display: "swap",
  src: "./PaperMono-Regular.woff2",
  variable: "--font-mono",
});
