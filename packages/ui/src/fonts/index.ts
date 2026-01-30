import { Inter } from "next/font/google";
import localFont from "next/font/local";

export const fontMono = localFont({
  display: "swap",
  src: "./PaperMono-Regular.woff2",
  variable: "--font-mono",
});

// Default font (current)
export const fontSans = localFont({
  display: "swap",
  src: "./CalSansUI[MODE,wght].woff2",
  variable: "--font-sans",
  weight: "300 700",
});

// Alternative font 1
export const fontSans1 = localFont({
  display: "swap",
  src: "./CalSansUI-1-VariableFont_wght.ttf",
  variable: "--font-sans-1",
});

// Alternative font 2
export const fontSans2 = localFont({
  display: "swap",
  src: "./CalSansUI-2-VariableFont_wght.ttf",
  variable: "--font-sans-2",
});

// Inter (Google Font)
export const fontSansInter = Inter({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-sans-inter",
});

export const fontHeading = localFont({
  display: "swap",
  src: "./CalSans-SemiBold.woff2",
  variable: "--font-heading",
  weight: "600",
});

// Font variant type
export type FontVariant = "default" | "variant1" | "variant2" | "inter";

// Cookie name for font switching
export const FONT_COOKIE_NAME = "coss-font-variant";
