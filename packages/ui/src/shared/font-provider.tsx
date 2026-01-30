"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { FontVariant } from "../fonts";
import { FONT_COOKIE_NAME } from "../fonts";

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return undefined;
}

function setCookie(name: string, value: string, maxAge = 31536000) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

type FontContextValue = {
  fontVariant: FontVariant;
  setFontVariant: (variant: FontVariant) => void;
};

const FontContext = createContext<FontContextValue | null>(null);

export function useFontVariant(): FontContextValue {
  const ctx = useContext(FontContext);
  if (!ctx) {
    throw new Error("useFontVariant must be used within FontProvider");
  }
  return ctx;
}

export function FontProvider({ children }: { children: React.ReactNode }) {
  const [fontVariant, setFontVariantState] = useState<FontVariant>("default");

  useEffect(() => {
    const cookieValue = getCookie(FONT_COOKIE_NAME) as FontVariant | undefined;
    const valid: FontVariant[] = ["default", "variant1", "variant2", "inter"];
    if (cookieValue && valid.includes(cookieValue)) {
      setFontVariantState(cookieValue);
    }
  }, []);

  const setFontVariant = useCallback((variant: FontVariant) => {
    setFontVariantState(variant);
    setCookie(FONT_COOKIE_NAME, variant);
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    root.classList.remove(
      "font-variant-default",
      "font-variant-1",
      "font-variant-2",
      "font-variant-inter",
    );

    switch (fontVariant) {
      case "variant1":
        root.classList.add("font-variant-1");
        break;
      case "variant2":
        root.classList.add("font-variant-2");
        break;
      case "inter":
        root.classList.add("font-variant-inter");
        break;
      default:
        root.classList.add("font-variant-default");
    }
  }, [fontVariant]);

  return (
    <FontContext.Provider value={{ fontVariant, setFontVariant }}>
      {children}
    </FontContext.Provider>
  );
}
