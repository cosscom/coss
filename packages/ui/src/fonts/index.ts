import localFont from "next/font/local";

export const fontSans = localFont({
  display: "swap",
  src: "./CalSansUI[MODE,wght].woff2",
  variable: "--font-sans",
});

export const fontHeading = localFont({
  display: "swap",
  src: "./CalSans-Regular.woff2",
  variable: "--font-heading",
});
