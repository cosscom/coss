import localFont from "next/font/local";

export const fontMono = localFont({
  display: "swap",
  src: "./PaperMono-Regular.woff2",
  variable: "--font-mono",
});

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
